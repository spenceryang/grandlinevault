# Notion Workspace Setup

Grand Line Vault uses two kinds of databases:

1. **Worker-managed sync databases**
   - `Grand Line Vault · Card Catalog`
   - `Grand Line Vault · Price Snapshots`
2. **User-created workflow databases**
   - `Scan Inbox`
   - `Owned Cards`
   - `Wishlists`

The Worker-managed databases are created by deployment. The user-created databases should live in the actual workspace that collectors use day to day.

## Project scope in Notion

For the hackathon workspace, keep the visible user journey One Piece-first:

```text
Scan Inbox → Owned Cards → Collection Gallery → Set Completion → Recommendations / Decks / Luffy Index
```

PriceCharting, PSA verification, and Pokémon/TCGdex are extension tracks. They can be mentioned in an Admin or Roadmap section, but they should not distract from the main One Piece collection loop unless their Worker tools and Notion databases are explicitly wired.


## Scan Inbox database

Create these properties exactly:

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | Any label, e.g. `Scan · Luffy`. |
| Front image | Files & media | Upload the card-front image here. This is the automation trigger. |
| Back image | Files & media | Optional, reserved for grading/pre-grade improvements. |
| Owner | Text | Collector name; defaults to Spencer if blank. |
| Status | Select | `New`, `Processing`, `Matched`, `Needs Review`, `Rejected`. |
| Recognition result | Text | Worker-written result summary. |
| Confidence | Number | Worker-written recognition confidence. |
| Linked owned card | URL | Worker-written link to the created Owned Cards page. |
| Notes | Text | Manual notes/review. |

Current fallback flow:

```text
Upload Front image → keep Status = New → ask the Agent to run handleNewScan for one card or handleAllNewScans for the queue
```

When Worker automation capabilities are enabled for the workspace, set `ENABLE_NOTION_AUTOMATIONS=1`, redeploy, and create this Notion database automation:

```text
When Front image is edited → Run Grand Line Vault Worker → Process Scan Inbox Upload
```

If you only want to process one row, use `processScanInboxPage` with the Scan Inbox page ID.

## Owned Cards database

Create these properties exactly:

| Property | Type |
| --- | --- |
| Name | Title |
| Owner | Text |
| Card ID | Text |
| Quantity | Number |
| Condition | Text |
| Pre-grade estimate | Text |
| Scan image | Files & media |

Recommended views:

- Gallery: grouped by Owner
- Table: all cards
- Duplicates: filter `Quantity > 1`

## Wishlists database

Recommended properties:

| Property | Type |
| --- | --- |
| Name | Title |
| Owner | Text |
| Card ID | Text |
| Priority | Select |
| Target price | Number |
| Status | Select |
| Reason | Text |

## Suggested top-level pages

```text
Grand Line Vault
├── Scan Inbox
├── My Collection
├── Crew Collection
├── Wishlists
├── Portfolio Dashboard
└── Admin
```

## Suggested dashboard widgets

- total portfolio value
- collection by rarity
- cards by set
- duplicate count
- recent additions
- visual card wall
- trophy case by market price

## Visual collection views

Add these linked Gallery views of **Owned Cards** to the Grand Line Vault page:

| View | Layout | Filter / sort | Purpose |
| --- | --- | --- | --- |
| `Image-only Wall` | Gallery, card preview = Page cover, card size = Large, all properties hidden | optional owner filter | Pure card-art binder view |
| `My Collection Wall` | Gallery, card preview = Page cover, card size = Large | owner filter for the active collector; show Card ID / Owner / Quantity / Market Price | Binder view with light metadata |
| `Crew Wall` | Gallery, card preview = Page cover | no owner filter | Shared workspace collection |
| `Binder by Set` | Gallery, grouped by `Set Code` | sort `Card ID` ascending | Browse like a physical binder |
| `Trophy Case` | Gallery, card preview = Page cover | sort `Market Price` descending | Show the most valuable cards first |
| `Duplicates` | Gallery, card preview = Page cover | `Quantity > 1` | Trade candidate surface |

For `Image-only Wall`, hide every property so only the card images remain. For the other Gallery views, show only the properties that matter visually: `Card ID`, `Owner`, `Quantity`, and `Market Price`. Hide long text fields so the card image carries the page.

## Demo path

1. Create a Scan Inbox row.
2. Upload an English One Piece card-front image to `Front image`.
3. Ask Vault Quartermaster / Notion Agent to process the latest scan. If needed, use `handleNewScan` for one row or `handleAllNewScans` for up to 10 queued rows.
4. Ask from Slack: `what card did I just scan?`
5. Ask from Slack: `show my OP-01 cards`, then follow up with `which is the most expensive?`
6. Open `Image-only Wall` first for the visual binder moment, then `Trophy Case` and the Set Completion Dashboard for value/progress context.

## Slack Agent instructions

Use these rules in the Notion Custom Agent connected to Slack:

- Treat the Grand Line Vault Notion page and databases as the source of truth.
- Default to the requesting user's owned cards when the owner is clear; say explicitly when showing all crew cards.
- For follow-up questions, preserve the previous filter context. Example: after `show my OP-01 cards`, `which is the most expensive?` should mean the most expensive OP-01 result.
- Prefer collector-friendly IDs like `OP01-001 Parallel`; avoid exposing internal variant IDs like `OP01-001_p1` unless useful for debugging.
- Include card name, set/card number, rarity or type, color, quantity, owner, market price, and a Notion link when available.


## Slack image intake

Vault Quartermaster can process an image that starts in Slack, but Slack-hosted file URLs are private. Configure a Slack bot token so the Worker can download the file bytes before sending them through OpenAI vision.

Required deployed Worker env vars:

```text
SLACK_BOT_TOKEN=xoxb-...
SLACK_OWNER_MAP=U_SLACK_SPENCER:Spencer,U_SLACK_JARREN:Jarren,U_SLACK_WAFFLE:Waffle
```

Supported paths:

1. **Agent tool path** — if the Notion Agent can see or pass the Slack file URL, ask it to call `processSlackCardImage` with `imageUrl`, `slackUserId`, and/or `ownerName`.
2. **Relay/webhook path** — deploy `api/slack-relay.ts` and point Slack Event Subscriptions at it. The relay handles Slack URL verification, extracts image files from `app_mention` / `file_shared` events, forwards the Slack file URL to the Worker webhook `slackCardIntake`, and the Worker creates the Scan Inbox + Owned Card rows.

Relay deployment env vars:

```text
NOTION_SLACK_INTAKE_WEBHOOK_URL=https://www.notion.so/webhooks/worker/...
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

Slack setup:

1. Deploy the repo to Vercel or another host that exposes `api/slack-relay.ts` as `/api/slack-relay`.
2. Slack app → **Event Subscriptions** → Enable Events.
3. Request URL: `https://<your-deploy>/api/slack-relay`.
4. Bot events: `app_mention`, `file_shared`.
5. OAuth scopes: `files:read`, `chat:write`, `app_mentions:read`, `channels:history`, `groups:history`.
6. Reinstall the Slack app after changing scopes/events.
7. Invite GrandlineVault to the test channel.

Recommended demo prompts:

- `@Vault Quartermaster scan this for Spencer`
- `@Vault Quartermaster add this card to Jarren's collection`
- `@Vault Quartermaster process this image for Waffle`

Expected result:

```text
Added to Spencer's collection: Matched Nami (OP01-016) · OP-01 · R · $1.35
Owned card: https://www.notion.so/...
Scan Inbox: https://www.notion.so/...
```
