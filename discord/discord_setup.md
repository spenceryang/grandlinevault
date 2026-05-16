# Grand Line Vault — Discord bot setup

A small Discord bot that turns image uploads in a configured channel into Scan Inbox rows. The Worker's existing `processScanInboxQueue` then recognizes the card and adds it to the Owned Cards database — no separate Discord-side recognition pipeline needed.

The bot is a **separate Node.js process** from the Notion Worker. It runs anywhere that can hold a persistent websocket connection: a small VPS, a Fly.io instance, Railway, a Raspberry Pi, etc.

## 1. Create the Discord application

1. Go to https://discord.com/developers/applications and click **New Application**. Name it `Grand Line Vault Scan Bot` (or whatever).
2. Open **Bot** in the sidebar → **Reset Token** → copy the token. This is `DISCORD_BOT_TOKEN`. Treat it like a password.
3. In the same Bot section, scroll to **Privileged Gateway Intents** and enable **MESSAGE CONTENT INTENT**. The bot reads message attachments and needs this intent.
4. Save the changes.

## 2. Invite the bot to your server

In the developer portal, open **OAuth2 → URL Generator**:
- Scopes: `bot`
- Bot Permissions: `View Channels`, `Send Messages`, `Read Message History`, `Add Reactions`
- Copy the generated URL, open it in a browser, choose the server, and authorize.

## 3. Find your scan channel ID

In Discord, enable Developer Mode (Settings → Advanced → Developer Mode). Right-click the channel you want to use for card uploads and click **Copy Channel ID**. This is `DISCORD_SCAN_CHANNEL_ID`.

## 4. Configure environment

In `discord/.env`:

```text
DISCORD_BOT_TOKEN=...           # from step 1
DISCORD_SCAN_CHANNEL_ID=...     # from step 3
NOTION_API_TOKEN=...            # same token used by the Worker
SCAN_INBOX_DATA_SOURCE_ID=...   # same data-source id used by the Worker
```

The bot reuses the **same** Notion token and Scan Inbox data source as the Worker — there's nothing Discord-specific on the Notion side. Each Discord upload becomes a Scan Inbox row with `Submitted By = "<discord-username> (Discord: <user-id>)"` and `Source = "Discord: <message-url>"`.

## 5. Install and run

```bash
cd discord
npm install
npm start
```

You should see:

```
Grand Line Vault Discord bot ready as ScanBot#0001
```

Drop a card image in the configured channel and the bot replies with a confirmation:

```
Queueing 1 card photo(s) to the Scan Inbox…
✅ luffy.jpg
```

The next time `processScanInboxQueue` runs on the Worker, the row will be recognized + enriched + an Owned Card created. The collector sees the card show up in their Notion gallery within a minute.

## 6. Deploy

Pick a runtime that supports persistent connections. Two cheap defaults:

- **Fly.io**: `fly launch` in the `discord/` folder. Use a `Dockerfile` with `node:22-slim` and `CMD ["npm","start"]`. The bot is single-instance, no scale-to-zero.
- **Railway**: Create a service, point at `discord/` as the root, set the start command to `npm start`, add env vars.

A small VPS (DigitalOcean droplet, $4/mo) also works fine — run with `pm2 start npm --name glv-scan-bot -- start`.

## How it actually works

1. The bot subscribes to `Events.MessageCreate` (filtered to `DISCORD_SCAN_CHANNEL_ID`).
2. It pulls all `image/*` attachments off the message.
3. For each attachment, it creates a Scan Inbox row in Notion with the Discord CDN image URL plugged into the `Front image` files property.
4. Discord CDN URLs are signed but **temporarily** valid — the Worker's recognition + enrichment pipeline should consume them quickly. For long-lived image storage, a follow-up improvement is to upload the bytes to Notion's file API instead of using the external URL directly.

## Security notes

- The Discord token grants full access to the bot account — never check it into the repo, never share it in screenshots.
- The bot only reads messages in the configured channel ID. Messages elsewhere are ignored.
- Non-image attachments are filtered out before the Notion write happens.
- The bot replies in the channel so the sender knows their card was queued. This is intentional — silent processing is a worse user experience.

## Future enhancements

- **Slash command** `/scan` for an explicit upload flow (instead of relying on plain-message attachments)
- **Result echo** — once `processScanInboxQueue` matches the card, post the matched card name + image back into the Discord channel so the collector sees the result without leaving Discord
- **Wishlist trigger** `/wishlist add OP01-003` straight from Discord
- **Trade match alert** — DM the collector when the daily `syncTradeMatches` produces a new high-priority opportunity that involves them
