import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
	buildNotionWorkerPayload,
	handleSlackRelayRequest,
	inferOwnerNameFromText,
	verifySlackSignature,
} from "../src/relay/slack-relay.js";

test("verifySlackSignature accepts valid Slack signatures", () => {
	const rawBody = JSON.stringify({ type: "event_callback" });
	const timestamp = "1700000000";
	const signature = `v0=${createHmac("sha256", "secret")
		.update(`v0:${timestamp}:${rawBody}`)
		.digest("hex")}`;

	assert.equal(
		verifySlackSignature({
			signingSecret: "secret",
			rawBody,
			headers: {
				"x-slack-request-timestamp": timestamp,
				"x-slack-signature": signature,
			},
			nowSeconds: 1700000000,
		}),
		true,
	);
});

test("verifySlackSignature rejects stale Slack signatures", () => {
	assert.equal(
		verifySlackSignature({
			signingSecret: "secret",
			rawBody: "{}",
			headers: {
				"x-slack-request-timestamp": "1700000000",
				"x-slack-signature": "v0=bad",
			},
			nowSeconds: 1700001000,
		}),
		false,
	);
});

test("buildNotionWorkerPayload forwards image files from app mentions", async () => {
	assert.deepEqual(
		await buildNotionWorkerPayload(
			{
				type: "event_callback",
				event: {
					user: "U123",
					text: "<@UGLV> add OP13-003 to Jarren",
					files: [
						{
							name: "OP13-003.jpg",
							mimetype: "image/jpeg",
							url_private_download: "https://files.slack.com/op13-003.jpg",
						},
					],
				},
			},
			{},
		),
		{
			event: {
				user: "U123",
				files: [
					{
						name: "OP13-003.jpg",
						mimetype: "image/jpeg",
						url_private_download: "https://files.slack.com/op13-003.jpg",
					},
				],
			},
			ownerName: "Jarren",
			filename: "OP13-003.jpg add OP13-003 to Jarren",
			user_id: undefined,
			response_url: undefined,
		},
	);
});

test("buildNotionWorkerPayload fetches file_shared metadata when file id is provided", async () => {
	const payload = await buildNotionWorkerPayload(
		{
			type: "event_callback",
			event: {
				user: "U123",
				file_id: "F123",
			},
		},
		{ slackBotToken: "xoxb-test" },
		async (url, init) => {
			assert.equal(String(url), "https://slack.com/api/files.info?file=F123");
			assert.equal(init?.headers?.["Authorization"], "Bearer xoxb-test");
			return new Response(
				JSON.stringify({
					ok: true,
					file: {
						name: "OP13-003.jpg",
						mimetype: "image/jpeg",
						url_private_download: "https://files.slack.com/op13-003.jpg",
					},
				}),
				{ status: 200 },
			);
		},
	);

	assert.equal(payload?.event?.files?.[0]?.name, "OP13-003.jpg");
});

test("handleSlackRelayRequest responds to Slack URL verification", async () => {
	assert.deepEqual(
		await handleSlackRelayRequest({
			rawBody: JSON.stringify({
				type: "url_verification",
				challenge: "challenge-token",
			}),
			headers: { "content-type": "application/json" },
			config: { notionWebhookUrl: "https://notion.example/webhook" },
		}),
		{
			status: 200,
			body: { challenge: "challenge-token" },
		},
	);
});

test("inferOwnerNameFromText reads supported owner names", () => {
	assert.equal(inferOwnerNameFromText("add to Spencer"), "Spencer");
	assert.equal(inferOwnerNameFromText("for jarren please"), "Jarren");
	assert.equal(inferOwnerNameFromText("waffle scan"), "Waffle");
	assert.equal(inferOwnerNameFromText("unknown owner"), undefined);
});

test("handleSlackRelayRequest forwards Slack image payload to Notion worker", async () => {
	let forwardedBody: unknown;
	const response = await handleSlackRelayRequest({
		rawBody: JSON.stringify({
			type: "event_callback",
			event: {
				user: "U123",
				text: "<@UGLV> OP13-003 for Spencer",
				files: [
					{
						name: "OP13-003.jpg",
						mimetype: "image/jpeg",
						url_private_download: "https://files.slack.com/op13-003.jpg",
					},
				],
			},
		}),
		headers: { "content-type": "application/json" },
		config: { notionWebhookUrl: "https://notion.example/webhook" },
		fetchImpl: async (_url, init) => {
			forwardedBody = JSON.parse(String(init?.body));
			return new Response("ok", { status: 200 });
		},
	});

	assert.deepEqual(response, {
		status: 200,
		body: { ok: true, forwarded: true },
	});
	assert.deepEqual(forwardedBody, {
		event: {
			user: "U123",
			files: [
				{
					name: "OP13-003.jpg",
					mimetype: "image/jpeg",
					url_private_download: "https://files.slack.com/op13-003.jpg",
				},
			],
		},
		ownerName: "Spencer",
		filename: "OP13-003.jpg OP13-003 for Spencer",
	});
});
