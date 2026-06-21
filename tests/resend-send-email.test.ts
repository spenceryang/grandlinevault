import assert from "node:assert/strict";
import test from "node:test";
import {
	buildPromotionalHtml,
	buildScanReceiptHtml,
	buildTradeMatchHtml,
	sendResendEmail,
} from "../src/providers/resend/send-email.js";

test("sendResendEmail rejects missing api key", async () => {
	await assert.rejects(
		() =>
			sendResendEmail(
				{ from: "a@b.com", to: "c@d.com", subject: "x", text: "y" },
				"",
			),
		/RESEND_API_KEY is required/,
	);
});

test("sendResendEmail rejects empty subject", async () => {
	await assert.rejects(
		() =>
			sendResendEmail(
				{ from: "a@b.com", to: "c@d.com", subject: "   ", text: "y" },
				"key",
			),
		/subject must not be empty/,
	);
});

test("sendResendEmail rejects missing body", async () => {
	await assert.rejects(
		() => sendResendEmail({ from: "a@b.com", to: "c@d.com", subject: "x" }, "key"),
		/html or text body/,
	);
});

test("sendResendEmail posts to /emails with Bearer auth and JSON body", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	let capturedInit: RequestInit | undefined;
	globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		capturedUrl = String(input);
		capturedInit = init;
		return new Response(JSON.stringify({ id: "msg_123" }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const result = await sendResendEmail(
			{
				from: "scans@grandlinevault.com",
				to: "collector@example.com",
				subject: "Card added",
				html: "<p>Hi</p>",
				replyTo: "support@grandlinevault.com",
			},
			"re_abc123",
		);
		assert.equal(result.id, "msg_123");
		assert.match(capturedUrl, /\/emails$/);
		const headers = capturedInit?.headers as Record<string, string>;
		assert.equal(headers["Authorization"], "Bearer re_abc123");
		const body = JSON.parse(capturedInit?.body as string);
		assert.equal(body.subject, "Card added");
		assert.equal(body.reply_to, "support@grandlinevault.com");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("sendResendEmail surfaces error message from response body", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(
			JSON.stringify({
				name: "validation_error",
				message: "from address is not verified",
				statusCode: 422,
			}),
			{ status: 422, headers: { "content-type": "application/json" } },
		)) as typeof fetch;
	try {
		await assert.rejects(
			() =>
				sendResendEmail(
					{ from: "x@y.com", to: "a@b.com", subject: "x", text: "y" },
					"key",
				),
			/from address is not verified/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("buildScanReceiptHtml escapes user-controlled fields", () => {
	const html = buildScanReceiptHtml({
		collectorEmail: "spencer@<script>alert(1)</script>",
		cardName: "Card & <img>",
		cardId: "OP01-001",
	});
	assert.ok(!html.includes("<script>"));
	assert.ok(html.includes("&lt;script&gt;"));
	assert.ok(html.includes("Card &amp; &lt;img&gt;"));
});

test("buildTradeMatchHtml renders available quantity and priority", () => {
	const html = buildTradeMatchHtml({
		toOwnerEmail: "jarren@example.com",
		fromOwnerName: "Spencer",
		cardName: "Monkey.D.Luffy (003)",
		cardId: "OP01-003",
		availableQuantity: 2,
		priority: "High",
	});
	assert.ok(html.includes("2 available"));
	assert.ok(html.includes("High priority"));
	assert.ok(html.includes("Monkey.D.Luffy (003)"));
});

test("buildPromotionalHtml renders optional CTA only when both label and URL set", () => {
	const withCta = buildPromotionalHtml({
		title: "New set dropped",
		body: "<p>OP-16 launches next week.</p>",
		ctaLabel: "See cards",
		ctaUrl: "https://example.com",
	});
	assert.ok(withCta.includes("See cards"));
	const withoutCta = buildPromotionalHtml({
		title: "Heads up",
		body: "<p>Maintenance window.</p>",
	});
	assert.ok(!withoutCta.includes("background: #0066ff"));
});
