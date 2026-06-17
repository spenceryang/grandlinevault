# discord/

Standalone Discord bot for Grand Line Vault. Turns image uploads in a configured Discord channel into rows in the Notion Scan Inbox so the Worker's existing recognition + enrichment pipeline picks them up.

The bot is a **separate Node.js process** from the Notion Worker — it lives in its own subdirectory with its own `package.json`, `tsconfig.json`, and dependencies (`discord.js`, `@notionhq/client`). It deploys anywhere that supports a persistent websocket (Fly.io, Railway, a $4 VPS, a Pi).

See [`discord_setup.md`](./discord_setup.md) for the full setup walkthrough (Discord application + bot user + permissions + env vars + run + deploy).

## Files

- `src/bot.ts` — main bot entry; listens for `messageCreate` in the configured channel and forwards image attachments
- `src/scan-handler.ts` — Notion write that creates a Scan Inbox row per image
- `package.json` / `tsconfig.json` — independent Node.js project so the main worker doesn't pull `discord.js` into its bundle

## How to run

```bash
cd discord
npm install
cp .env.example .env  # fill in DISCORD_BOT_TOKEN, DISCORD_SCAN_CHANNEL_ID, NOTION_API_TOKEN, SCAN_INBOX_DATA_SOURCE_ID
npm start
```

## Draft scope

This branch is intentionally a **scaffold draft** for spencer to review. The bot will compile and run once `npm install` pulls discord.js, but it has not been deployed yet. Future PRs after spencer's review should cover:

- Notion file upload for durable image storage (currently uses Discord's temporary CDN URL)
- Slash command UX (`/scan`, `/wishlist add`)
- Result echo back into Discord once the Worker matches the card
- Trade-match DMs
- A `Dockerfile` for Fly.io / Railway deploys
