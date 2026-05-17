import { createHmac, timingSafeEqual } from "node:crypto";

export type SlackRelayConfig = {
	notionWebhookUrl: string;
	slackBotToken?: string;
	slackSigningSecret?: string;
};

export type SlackRelayResponse = {
	status: number;
	body: unknown;
};

export type SlackRelayHeaders = Record<string, string | string[] | undefined>;

type SlackEventEnvelope = {
	type?: string;
	challenge?: string;
	event?: SlackEvent;
	user_id?: string;
	ownerName?: string;
	filename?: string;
	response_url?: string;
};

type SlackEvent = {
	type?: string;
	subtype?: string;
	user?: string;
	text?: string;
	file_id?: string;
	files?: SlackFile[];
};

type SlackFile = {
	id?: string;
	name?: string;
	mimetype?: string;
	url_private?: string;
	url_private_download?: string;
};

export function verifySlackSignature(input: {
	signingSecret?: string;
	headers: SlackRelayHeaders;
	rawBody: string;
	nowSeconds?: number;
}): boolean {
	if (!input.signingSecret) return true;

	const timestamp = firstHeader(input.headers, "x-slack-request-timestamp");
	const signature = firstHeader(input.headers, "x-slack-signature");
	if (!timestamp || !signature) return false;

	const timestampSeconds = Number(timestamp);
	if (!Number.isFinite(timestampSeconds)) return false;

	const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
	if (Math.abs(nowSeconds - timestampSeconds) > 60 * 5) return false;

	const base = `v0:${timestamp}:${input.rawBody}`;
	const expected = `v0=${createHmac("sha256", input.signingSecret)
		.update(base)
		.digest("hex")}`;

	const actualBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expected);
	return (
		actualBuffer.length === expectedBuffer.length &&
		timingSafeEqual(actualBuffer, expectedBuffer)
	);
}

export async function handleSlackRelayRequest(input: {
	rawBody: string;
	headers: SlackRelayHeaders;
	config: SlackRelayConfig;
	fetchImpl?: typeof fetch;
}): Promise<SlackRelayResponse> {
	const fetchImpl = input.fetchImpl ?? fetch;
	if (
		!verifySlackSignature({
			signingSecret: input.config.slackSigningSecret,
			headers: input.headers,
			rawBody: input.rawBody,
		})
	) {
		return { status: 401, body: { ok: false, error: "invalid_slack_signature" } };
	}

	const payload = parseSlackPayload(
		input.rawBody,
		firstHeader(input.headers, "content-type"),
	);
	if (payload.type === "url_verification") {
		return { status: 200, body: { challenge: payload.challenge ?? "" } };
	}

	if (payload.type !== "event_callback") {
		return { status: 200, body: { ok: true, ignored: "unsupported_payload" } };
	}

	const relayPayload = await buildNotionWorkerPayload(
		payload,
		input.config,
		fetchImpl,
	);
	if (!relayPayload) {
		return { status: 200, body: { ok: true, ignored: "no_image_file" } };
	}

	const response = await fetchImpl(input.config.notionWebhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(relayPayload),
	});

	if (!response.ok) {
		return {
			status: 502,
			body: {
				ok: false,
				error: "notion_worker_forward_failed",
				status: response.status,
			},
		};
	}

	return { status: 200, body: { ok: true, forwarded: true } };
}

export async function buildNotionWorkerPayload(
	payload: SlackEventEnvelope,
	config: Pick<SlackRelayConfig, "slackBotToken">,
	fetchImpl: typeof fetch = fetch,
): Promise<SlackEventEnvelope | null> {
	const event = payload.event;
	if (!event) return null;
	if (event.subtype === "bot_message") return null;

	const files =
		event.files?.filter(isImageSlackFile) ??
		(event.file_id
			? await fetchSlackImageFile(event.file_id, config.slackBotToken, fetchImpl)
			: []);

	if (files.length === 0) return null;

	return {
		event: {
			user: event.user,
			files,
		},
		ownerName: inferOwnerNameFromText(event.text),
		filename: buildRelayFilename(files[0], event.text),
		user_id: payload.user_id,
		response_url: payload.response_url,
	};
}

function parseSlackPayload(
	rawBody: string,
	contentType: string | undefined,
): SlackEventEnvelope {
	const normalizedContentType = contentType?.toLowerCase() ?? "";
	if (normalizedContentType.includes("application/x-www-form-urlencoded")) {
		const params = new URLSearchParams(rawBody);
		const encodedPayload = params.get("payload");
		if (encodedPayload) return JSON.parse(encodedPayload) as SlackEventEnvelope;
		return Object.fromEntries(params.entries()) as SlackEventEnvelope;
	}

	return JSON.parse(rawBody) as SlackEventEnvelope;
}

async function fetchSlackImageFile(
	fileId: string,
	botToken: string | undefined,
	fetchImpl: typeof fetch,
): Promise<SlackFile[]> {
	if (!botToken) return [];

	const response = await fetchImpl(
		`https://slack.com/api/files.info?file=${encodeURIComponent(fileId)}`,
		{ headers: { Authorization: `Bearer ${botToken}` } },
	);
	if (!response.ok) return [];

	const payload = (await response.json()) as { ok?: boolean; file?: SlackFile };
	if (!payload.ok || !payload.file || !isImageSlackFile(payload.file)) return [];
	return [payload.file];
}

function isImageSlackFile(file: SlackFile): boolean {
	const mimetype = file.mimetype?.toLowerCase() ?? "";
	return (
		(!mimetype || mimetype.startsWith("image/")) &&
		Boolean(file.url_private_download ?? file.url_private)
	);
}

export function inferOwnerNameFromText(text: string | undefined): string | undefined {
	const normalized = text?.toLowerCase() ?? "";
	if (/\bspencer\b/.test(normalized)) return "Spencer";
	if (/\bjarren\b/.test(normalized)) return "Jarren";
	if (/\bwaffle\b/.test(normalized)) return "Waffle";
	return undefined;
}

function buildRelayFilename(
	file: SlackFile | undefined,
	text: string | undefined,
): string | undefined {
	const filename = file?.name?.trim();
	const commandText = text?.replace(/<@[^>]+>/g, "").trim();
	if (!filename) return commandText;
	if (!commandText) return filename;
	return `${filename} ${commandText}`.slice(0, 180);
}

function firstHeader(
	headers: SlackRelayHeaders,
	name: string,
): string | undefined {
	const direct = headers[name] ?? headers[name.toLowerCase()];
	const value = Array.isArray(direct) ? direct[0] : direct;
	return value;
}
