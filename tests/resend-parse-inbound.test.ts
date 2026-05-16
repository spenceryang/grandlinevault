import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { ResendInboundWebhookPayload } from "../src/providers/resend/inbound-types.js";
import {
	extractImageAttachments,
	isImageContentType,
	parseInboundScan,
	ResendVerificationError,
	verifyResendSignature,
} from "../src/providers/resend/parse-inbound.js";

function makePayload(
	overrides: Partial<ResendInboundWebhookPayload["data"]> = {},
): ResendInboundWebhookPayload {
	return {
		type: "email.inbound.delivered",
		created_at: "2026-05-16T22:00:00Z",
		data: {
			id: "msg_abc",
			from: "collector@example.com",
			to: ["scans@grandlinevault.com"],
			subject: "Front of card",
			text: null,
			html: null,
			headers: [],
			attachments: [
				{
					filename: "card.jpg",
					contentType: "image/jpeg",
					size: 9,
					content: Buffer.from("imageData").toString("base64"),
				},
			],
			receivedAt: "2026-05-16T22:00:00Z",
			...overrides,
		},
	};
}

test("isImageContentType matches common image types", () => {
	assert.ok(isImageContentType("image/jpeg"));
	assert.ok(isImageContentType("IMAGE/PNG"));
	assert.ok(isImageContentType("image/webp"));
	assert.ok(!isImageContentType("text/html"));
	assert.ok(!isImageContentType("application/pdf"));
});

test("extractImageAttachments decodes base64 and skips non-images", () => {
	const result = extractImageAttachments([
		{
			filename: "card.jpg",
			contentType: "image/jpeg",
			size: 5,
			content: Buffer.from("HELLO").toString("base64"),
		},
		{
			filename: "notes.txt",
			contentType: "text/plain",
			size: 6,
			content: Buffer.from("ignore").toString("base64"),
		},
	]);
	assert.equal(result.length, 1);
	assert.equal(result[0].filename, "card.jpg");
	assert.equal(result[0].sizeBytes, 5);
	assert.equal(result[0].bytes.toString("utf8"), "HELLO");
});

test("parseInboundScan extracts image attachments from a delivered email", () => {
	const parsed = parseInboundScan(makePayload());
	assert.equal(parsed.messageId, "msg_abc");
	assert.equal(parsed.from, "collector@example.com");
	assert.deepEqual(parsed.to, ["scans@grandlinevault.com"]);
	assert.equal(parsed.subject, "Front of card");
	assert.equal(parsed.imageAttachments.length, 1);
	assert.equal(parsed.imageAttachments[0].contentType, "image/jpeg");
});

test("parseInboundScan rejects non-delivered events", () => {
	const payload = makePayload();
	(payload as { type: string }).type = "email.inbound.bounced";
	assert.throws(() => parseInboundScan(payload), /Unsupported Resend event/);
});

test("verifyResendSignature accepts a valid v1 signature", () => {
	const secret = "whsec_" + Buffer.from("supersecret").toString("base64");
	const id = "msg_abc";
	const ts = Math.floor(Date.now() / 1000).toString();
	const body = JSON.stringify({ hello: "world" });
	const signingSecret = Buffer.from("supersecret");
	const sig = createHmac("sha256", signingSecret)
		.update(`${id}.${ts}.${body}`)
		.digest("base64");
	verifyResendSignature({
		rawBody: body,
		headers: {
			"svix-id": id,
			"svix-timestamp": ts,
			"svix-signature": `v1,${sig}`,
		},
		secret,
	});
});

test("verifyResendSignature rejects a mismatched signature", () => {
	const secret = "whsec_" + Buffer.from("supersecret").toString("base64");
	const id = "msg_abc";
	const ts = Math.floor(Date.now() / 1000).toString();
	const body = JSON.stringify({ hello: "world" });
	assert.throws(
		() =>
			verifyResendSignature({
				rawBody: body,
				headers: {
					"svix-id": id,
					"svix-timestamp": ts,
					"svix-signature": "v1,not-a-real-sig",
				},
				secret,
			}),
		/Signature mismatch|No v1 signature/,
	);
});

test("verifyResendSignature rejects stale timestamps", () => {
	const secret = "whsec_" + Buffer.from("supersecret").toString("base64");
	const id = "msg_abc";
	// 30 minutes ago
	const ts = (Math.floor(Date.now() / 1000) - 1800).toString();
	const body = JSON.stringify({ hello: "world" });
	const sig = createHmac("sha256", Buffer.from("supersecret"))
		.update(`${id}.${ts}.${body}`)
		.digest("base64");
	assert.throws(
		() =>
			verifyResendSignature({
				rawBody: body,
				headers: {
					"svix-id": id,
					"svix-timestamp": ts,
					"svix-signature": `v1,${sig}`,
				},
				secret,
			}),
		ResendVerificationError,
		"expected verification error for stale timestamp",
	);
});

test("verifyResendSignature rejects missing headers", () => {
	assert.throws(
		() =>
			verifyResendSignature({
				rawBody: "{}",
				headers: {
					"svix-id": "",
					"svix-timestamp": "",
					"svix-signature": "",
				},
				secret: "whsec_abc",
			}),
		/Missing one of svix-id/,
	);
});

test("verifyResendSignature rejects empty secret", () => {
	assert.throws(
		() =>
			verifyResendSignature({
				rawBody: "{}",
				headers: {
					"svix-id": "x",
					"svix-timestamp": String(Math.floor(Date.now() / 1000)),
					"svix-signature": "v1,sig",
				},
				secret: "",
			}),
		/Webhook secret must be provided/,
	);
});
