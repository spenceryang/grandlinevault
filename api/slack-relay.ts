import type { IncomingMessage, ServerResponse } from "node:http";
import { handleSlackRelayRequest } from "../src/relay/slack-relay.js";

export default async function handler(
	req: IncomingMessage,
	res: ServerResponse,
) {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
		return;
	}

	const rawBody = await readRequestBody(req);
	const response = await handleSlackRelayRequest({
		rawBody,
		headers: req.headers,
		config: {
			notionWebhookUrl: requireEnv("NOTION_SLACK_INTAKE_WEBHOOK_URL"),
			slackBotToken: process.env.SLACK_BOT_TOKEN,
			slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
		},
	});

	res.statusCode = response.status;
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(response.body));
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required.`);
	return value;
}
