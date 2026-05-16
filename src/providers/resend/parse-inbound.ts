import { createHmac, timingSafeEqual } from "node:crypto";
import type {
	ParsedAttachment,
	ParsedInboundScan,
	ResendInboundWebhookPayload,
	ResendWebhookHeaders,
} from "./inbound-types.js";

export const IMAGE_CONTENT_TYPE_PREFIXES = ["image/"];
export const MAX_AGE_SECONDS = 5 * 60;
export const SUPPORTED_INBOUND_EVENT = "email.inbound.delivered" as const;

export class ResendVerificationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ResendVerificationError";
	}
}

export function verifyResendSignature(input: {
	rawBody: string;
	headers: ResendWebhookHeaders;
	secret: string;
	now?: Date;
}): void {
	const { rawBody, headers, secret } = input;
	if (!secret) {
		throw new ResendVerificationError("Webhook secret must be provided.");
	}
	const svixId = headers["svix-id"];
	const svixTimestamp = headers["svix-timestamp"];
	const svixSignature = headers["svix-signature"];
	if (!svixId || !svixTimestamp || !svixSignature) {
		throw new ResendVerificationError(
			"Missing one of svix-id, svix-timestamp, svix-signature header.",
		);
	}

	const now = input.now ?? new Date();
	const timestamp = Number(svixTimestamp);
	if (!Number.isFinite(timestamp)) {
		throw new ResendVerificationError("svix-timestamp header is not a number.");
	}
	const ageSeconds = Math.abs(now.getTime() / 1000 - timestamp);
	if (ageSeconds > MAX_AGE_SECONDS) {
		throw new ResendVerificationError(
			`Webhook timestamp is too old (${Math.round(ageSeconds)}s, max ${MAX_AGE_SECONDS}s).`,
		);
	}

	const signingSecret = secret.startsWith("whsec_")
		? Buffer.from(secret.slice("whsec_".length), "base64")
		: Buffer.from(secret, "utf-8");
	const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
	const expected = createHmac("sha256", signingSecret)
		.update(toSign)
		.digest("base64");

	const provided = svixSignature
		.split(" ")
		.map((s) => s.trim())
		.filter((s) => s.startsWith("v1,"))
		.map((s) => s.slice("v1,".length));
	if (provided.length === 0) {
		throw new ResendVerificationError(
			"No v1 signature found in svix-signature header.",
		);
	}
	const expectedBuf = Buffer.from(expected);
	const matched = provided.some((sig) => {
		const providedBuf = Buffer.from(sig);
		if (providedBuf.length !== expectedBuf.length) return false;
		return timingSafeEqual(providedBuf, expectedBuf);
	});
	if (!matched) {
		throw new ResendVerificationError("Signature mismatch.");
	}
}

export function parseInboundScan(
	payload: ResendInboundWebhookPayload,
): ParsedInboundScan {
	if (payload.type !== SUPPORTED_INBOUND_EVENT) {
		throw new Error(
			`Unsupported Resend event type: ${payload.type}. Expected ${SUPPORTED_INBOUND_EVENT}.`,
		);
	}
	const email = payload.data;
	const imageAttachments = extractImageAttachments(email.attachments ?? []);
	return {
		messageId: email.id,
		from: email.from,
		to: email.to ?? [],
		subject: email.subject ?? null,
		receivedAt: email.receivedAt,
		imageAttachments,
	};
}

export function extractImageAttachments(
	attachments: ReadonlyArray<{
		filename: string;
		contentType: string;
		size: number;
		content: string;
	}>,
): ParsedAttachment[] {
	const result: ParsedAttachment[] = [];
	for (const a of attachments) {
		if (!isImageContentType(a.contentType)) continue;
		let bytes: Buffer;
		try {
			bytes = Buffer.from(a.content, "base64");
		} catch {
			continue;
		}
		result.push({
			filename: a.filename,
			contentType: a.contentType,
			bytes,
			sizeBytes: bytes.length,
		});
	}
	return result;
}

export function isImageContentType(contentType: string): boolean {
	return IMAGE_CONTENT_TYPE_PREFIXES.some((p) =>
		contentType.toLowerCase().startsWith(p),
	);
}
