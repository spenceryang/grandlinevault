# Vercel UI

Grand Line Vault now has a Vercel-ready web UI layered on top of the existing Notion source of truth.

## What it does

- Reads `Owned Cards` from Notion through `/api/collection`.
- Renders a visual card wall with filters for owner, game, and search.
- Supports One Piece and Pokemon cards in the same collection view.
- Searches English Pokemon cards through TCGdex via `/api/pokemon-search`.
- Adds selected Pokemon cards into the Notion `Owned Cards` data source via `/api/add-pokemon-card`.

This is intentionally not a replacement for Notion. Notion remains the database, automation layer, and agent surface. The Vercel UI is the polished public/app layer.

## Required Vercel environment variables

```bash
NOTION_TOKEN=secret_xxx
OWNED_CARDS_DATA_SOURCE_ID=c3d6f9ce-e062-47f3-81cc-d1f3c46fa3fc
DEFAULT_OWNER=Spencer
```

Optional existing variables still apply for scan recognition, Slack relay, and workers:

```bash
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4.1-mini
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
NOTION_SLACK_INTAKE_WEBHOOK_URL=...
```

Do not put Notion worker `ntn` auth tokens or Slack user tokens in Vercel. Use a standard Notion integration secret for `NOTION_TOKEN`.

## Notion setup

1. Create or open a Notion integration at <https://www.notion.so/profile/integrations>.
2. Copy its internal integration secret into `NOTION_TOKEN`.
3. Share the Grand Line Vault page and the `Owned Cards` database with that integration.
4. Make sure `OWNED_CARDS_DATA_SOURCE_ID` points to the data source ID, not just the visual database page when possible.

The UI is schema-tolerant. It reads these properties when present:

- `Name`
- `Owner`
- `Card ID`
- `Game`
- `Set` or `Set Name`
- `Rarity`
- `Color`
- `Type` or `Card Type`
- `Quantity`
- `Market Price`
- `Card Image`, `Image`, or `Front image`
- `Tags`

For Pokemon writes, add a `Game` select property with `One Piece` and `Pokemon` if you want clean filtering. The add endpoint still works without it, but the UI will infer game from card IDs where possible.

## Deploy

1. Import the GitHub repo into Vercel.
2. Set the environment variables above.
3. Deploy.
4. Open `/` for the app.

API routes:

- `GET /api/collection`
- `GET /api/pokemon-search?q=pikachu`
- `POST /api/add-pokemon-card` with `{ "cardId": "swsh1-58", "owner": "Spencer", "quantity": 1 }`

## Next build slices

- Add image scan upload directly in the Vercel UI.
- Add OAuth so each user can connect their own Notion workspace.
- Add Pokemon price enrichment from PriceCharting or TCGplayer-compatible feeds.
- Add a unified scan recognizer that can classify One Piece vs Pokemon before enrichment.
