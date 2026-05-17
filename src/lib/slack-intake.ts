import type { Client } from "@notionhq/client";
import {
	processScanInboxImageBlob,
	type ProcessScanInboxResult,
} from "../notion/process-scan-inbox.js";
import {
	downloadSlackImage,
	parseSlackOwnerMap,
	resolveSlackOwnerName,
	type SlackOwnerMap,
} from "../providers/slack.js";

export type SlackCardIntakeInput = {
	imageUrl: string;
	ownerName?: string | null;
	slackUserId?: string | null;
	filename?: string | null;
	botToken?: string | null;
	ownerMap?: SlackOwnerMap;
};

export type SlackCardIntakeResult = ProcessScanInboxResult & {
	ownerName: string;
	filename: string;
	slackReply: string;
};

export async function processSlackCardImage(
	notion: Client,
	input: SlackCardIntakeInput,
): Promise<SlackCardIntakeResult> {
	const ownerName = resolveSlackOwnerName({
		ownerName: input.ownerName,
		slackUserId: input.slackUserId,
		ownerMap: input.ownerMap ?? parseSlackOwnerMap(),
	});
	const image = await downloadSlackImage({
		url: input.imageUrl,
		botToken: input.botToken,
		filename: input.filename,
	});

	const result = await processScanInboxImageBlob(notion, {
		ownerName,
		filename: image.filename,
		imageBlob: image.blob,
		contentType: image.contentType,
		source: "Slack",
	});

	return {
		...result,
		ownerName,
		filename: image.filename,
		slackReply: buildSlackCardIntakeReply(ownerName, result),
	};
}

export function buildSlackCardIntakeReply(
	ownerName: string,
	result: ProcessScanInboxResult,
): string {
	if (result.status === "Matched") {
		return [
			`Added to ${ownerName}'s collection: ${result.message}`,
			result.ownedCardUrl ? `Owned card: ${result.ownedCardUrl}` : null,
			result.scanInboxUrl ? `Scan Inbox: ${result.scanInboxUrl}` : null,
		]
			.filter(Boolean)
			.join("\n");
	}

	return [
		`I added the image to Scan Inbox for ${ownerName}, but it needs review: ${result.message}`,
		result.scanInboxUrl ? `Scan Inbox: ${result.scanInboxUrl}` : null,
	]
		.filter(Boolean)
		.join("\n");
}

export type SlackWebhookPayload = {
	event?: {
		user?: string;
		files?: Array<{
			url_private_download?: string;
			url_private?: string;
			name?: string;
			mimetype?: string;
		}>;
	};
	user_id?: string;
	user?: { id?: string } | string;
	file_url?: string;
	image_url?: string;
	url_private_download?: string;
	url_private?: string;
	filename?: string;
	ownerName?: string;
	owner?: string;
	response_url?: string;
};

export function extractSlackCardIntakeInput(
	payload: SlackWebhookPayload,
): SlackCardIntakeInput | null {
	const firstFile = payload.event?.files?.find((file) => {
		const mimetype = file.mimetype?.toLowerCase() ?? "";
		return !mimetype || mimetype.startsWith("image/");
	});
	const imageUrl =
		payload.image_url ??
		payload.file_url ??
		payload.url_private_download ??
		payload.url_private ??
		firstFile?.url_private_download ??
		firstFile?.url_private;

	if (!imageUrl) return null;

	const user = typeof payload.user === "string" ? payload.user : payload.user?.id;

	return {
		imageUrl,
		filename: payload.filename ?? firstFile?.name,
		ownerName: payload.ownerName ?? payload.owner,
		slackUserId: payload.user_id ?? user ?? payload.event?.user,
	};
}

export async function postSlackResponse(
	responseUrl: string,
	text: string,
): Promise<void> {
	const response = await fetch(responseUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text }),
	});
	if (!response.ok) {
		throw new Error(`Slack response_url post failed with ${response.status}.`);
	}
}
