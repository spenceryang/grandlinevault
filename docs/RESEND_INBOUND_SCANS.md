# Resend Inbound Scans

Lets collectors **email** card photos to a Resend inbound address (e.g. `scans@grandlinevault.com`). Each delivered email becomes one or more Scan Inbox rows, automatically tied to the sender's email and processed through the existing recognition → enrichment → owned-card pipeline.

Use case: a collector at a card shop snaps a photo with their phone, taps "Share → Email", types `scans@grandlinevault.com`, and by the time they're home the card is in their Notion collection.

## What this PR adds

### `src/providers/resend/inbound-types.ts`
Typed shapes for the Resend inbound webhook payload — `ResendInboundEmail`, `ResendInboundAttachment`, `ResendInboundWebhookPayload`, plus the `ParsedInboundScan` and `ParsedAttachment` shapes the downstream code consumes.

### `src/providers/resend/parse-inbound.ts`
- `verifyResendSignature({ rawBody, headers, secret })` — Svix-style HMAC-SHA256 verification with timestamp freshness (rejects payloads older than 5 minutes), strict v1 prefix check, and timing-safe equality. Handles both the `whsec_<base64>` and raw secret formats.
- `parseInboundScan(payload)` — turns a delivered email into a `ParsedInboundScan` with image-only attachments
- `extractImageAttachments(attachments)` — decodes base64 to `Buffer` and filters out non-image content types
- `isImageContentType(contentType)` — exact rule used: starts with `image/` (case-insensitive)

### `tests/resend-parse-inbound.test.ts`
9 tests covering signature happy path, signature mismatch, stale timestamp, missing headers, empty secret, non-image filtering, base64 decoding, event-type validation, and end-to-end parse.

## How to wire it up

This PR provides the library. Wiring to a worker webhook is intended for a follow-up PR — outline:

```ts
import {
  parseInboundScan,
  verifyResendSignature,
} from "./providers/resend/parse-inbound.js";

worker.webhook("resendInboundScan", {
  // The actual SDK signature for webhooks lives in @notionhq/workers/capabilities/webhook
  execute: async (event, context) => {
    const secret = requireEnv(config.resendWebhookSecret, "RESEND_WEBHOOK_SECRET");
    verifyResendSignature({
      rawBody: event.rawBody,
      headers: {
        "svix-id": event.headers["svix-id"] ?? "",
        "svix-timestamp": event.headers["svix-timestamp"] ?? "",
        "svix-signature": event.headers["svix-signature"] ?? "",
      },
      secret,
    });

    const payload = JSON.parse(event.rawBody);
    const scan = parseInboundScan(payload);

    // For each image attachment, create a Scan Inbox row pointing at the upload.
    // The existing processScanInboxPage helper picks it up next cycle.
    for (const att of scan.imageAttachments) {
      await queueScanFromAttachment(context.notion, {
        from: scan.from,
        receivedAt: scan.receivedAt,
        messageId: scan.messageId,
        att,
      });
    }

    return { ok: true };
  },
});
```

A small `queueScanFromAttachment` helper would:
1. Upload the attachment bytes to Notion (file upload API) so the Scan Inbox row has a `Front image` property
2. Create the Scan Inbox row with `Submitted By = scan.from`, status `New`
3. The existing `processScanInboxQueue` worker tool then recognizes + enriches + creates the owned card

That helper is intentionally **not** in this PR — it depends on a small additional Notion API surface that should land as its own reviewable change.

## Setup checklist (for the operator)

1. In the Resend dashboard, create an Inbound endpoint for the receiving address. Resend assigns a webhook URL — point it at your worker's deployed webhook URL.
2. Copy the **signing secret** from the Resend dashboard (format `whsec_<base64>`).
3. Add to `.env`:
   ```text
   RESEND_WEBHOOK_SECRET=whsec_...
   RESEND_INBOUND_ADDRESS=scans@grandlinevault.com
   ```
4. Push secrets to the worker: `ntn workers env push`.
5. Deploy: `ntn workers deploy`.

## Security

- **Signature verification is non-optional** — every handler call must call `verifyResendSignature` before trusting the payload. The Svix-style signature covers the `svix-id`, `svix-timestamp`, and raw body — replays older than 5 minutes are rejected.
- **Image-only filter** — any attachment whose `Content-Type` doesn't start with `image/` is dropped before processing. This stops "free PDF upload to my collection" mischief.
- **No outbound email** from the worker in this PR — purely inbound. If you later want notifications ("your scan was matched as Roronoa Zoro (003)"), wire Resend's outbound `emails.send` API separately.

## Edge cases handled

- Multiple image attachments in one email → multiple Scan Inbox rows (one per image)
- `cc` / `bcc` recipients — captured but not used for routing
- HTML-only emails → still parsed; just no `text` body
- Email with no attachments → returns 0 scans; the webhook still 200s
- Non-`delivered` event types (bounce, complaint) → throw early so the webhook surface returns a clear 422

## Future enhancements

- Use the `subject` line as a hint for `Submitted By` overrides ("collection: Casey" routes to a sub-collection)
- Detect front/back pairs in the same email by filename heuristic (`front.jpg` + `back.jpg`)
- Soft-quota per sender to avoid abuse
- A `scanReceipt` reply (use Resend outbound) so the sender gets a confirmation email with the matched card
