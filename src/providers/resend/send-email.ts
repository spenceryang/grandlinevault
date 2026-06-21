export const RESEND_API_BASE = "https://api.resend.com";

export type ResendSendEmailRequest = {
	from: string;
	to: string | string[];
	subject: string;
	html?: string;
	text?: string;
	cc?: string | string[];
	bcc?: string | string[];
	replyTo?: string | string[];
	headers?: Record<string, string>;
	tags?: Array<{ name: string; value: string }>;
};

export type ResendSendEmailResponse = {
	id: string;
};

export type ResendErrorResponse = {
	name?: string;
	message?: string;
	statusCode?: number;
};

export async function sendResendEmail(
	request: ResendSendEmailRequest,
	apiKey: string,
): Promise<ResendSendEmailResponse> {
	if (!apiKey) {
		throw new Error("RESEND_API_KEY is required to send email.");
	}
	if (!request.subject || !request.subject.trim()) {
		throw new Error("Email subject must not be empty.");
	}
	if (!request.html && !request.text) {
		throw new Error("Email must include either an html or text body.");
	}

	const body = {
		from: request.from,
		to: request.to,
		subject: request.subject,
		html: request.html,
		text: request.text,
		cc: request.cc,
		bcc: request.bcc,
		reply_to: request.replyTo,
		headers: request.headers,
		tags: request.tags,
	};

	const response = await fetch(`${RESEND_API_BASE}/emails`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		const errorBody = (await response.json().catch(() => ({}))) as ResendErrorResponse;
		const detail =
			errorBody.message || errorBody.name || (await response.text().catch(() => ""));
		throw new Error(
			`Resend send failed with ${response.status}: ${detail}`.trim(),
		);
	}
	return (await response.json()) as ResendSendEmailResponse;
}

export function buildScanReceiptHtml(input: {
	collectorEmail: string;
	cardName: string;
	cardId: string;
	imageUrl?: string | null;
	collectionUrl?: string | null;
}): string {
	const { collectorEmail, cardName, cardId, imageUrl, collectionUrl } = input;
	return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 8px;">Card added to your Vault</h1>
  <p style="color: #444; margin: 0 0 16px 0;">Hi ${escapeHtml(collectorEmail)}, we matched the card you sent:</p>
  ${imageUrl ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(cardName)}" style="width: 100%; border-radius: 8px; margin-bottom: 16px;" />` : ""}
  <p style="margin: 0 0 4px 0;"><strong>${escapeHtml(cardName)}</strong></p>
  <p style="margin: 0 0 16px 0; color: #888; font-size: 13px;">${escapeHtml(cardId)}</p>
  ${collectionUrl ? `<p><a href="${escapeAttr(collectionUrl)}" style="color: #0066ff;">Open in Notion →</a></p>` : ""}
</div>`;
}

export function buildTradeMatchHtml(input: {
	toOwnerEmail: string;
	fromOwnerName: string;
	cardName: string;
	cardId: string;
	availableQuantity: number;
	priority?: string | null;
}): string {
	const { toOwnerEmail, fromOwnerName, cardName, cardId, availableQuantity, priority } = input;
	return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 8px;">Possible trade in your Vault</h1>
  <p style="color: #444; margin: 0 0 16px 0;">Hi ${escapeHtml(toOwnerEmail)}, ${escapeHtml(fromOwnerName)} has a wishlist card you might want to trade for.</p>
  <p style="margin: 0 0 4px 0;"><strong>${escapeHtml(cardName)}</strong></p>
  <p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">${escapeHtml(cardId)} · ${availableQuantity} available${priority ? ` · ${escapeHtml(priority)} priority` : ""}</p>
  <p style="color: #555; font-size: 13px;">Reply to start the trade — or open the Trade Matches board in Notion for full context.</p>
</div>`;
}

export function buildPromotionalHtml(input: {
	title: string;
	body: string;
	ctaLabel?: string;
	ctaUrl?: string;
}): string {
	const { title, body, ctaLabel, ctaUrl } = input;
	return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 22px; margin-bottom: 12px;">${escapeHtml(title)}</h1>
  <div style="color: #333; line-height: 1.5; margin-bottom: 16px;">${body}</div>
  ${ctaLabel && ctaUrl ? `<p><a href="${escapeAttr(ctaUrl)}" style="display: inline-block; background: #0066ff; color: white; padding: 10px 16px; border-radius: 6px; text-decoration: none;">${escapeHtml(ctaLabel)}</a></p>` : ""}
</div>`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
	return escapeHtml(value);
}
