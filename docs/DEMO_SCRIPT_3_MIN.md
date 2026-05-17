# Grand Line Vault — 3-minute demo script

## Goal
Show that Grand Line Vault is a Notion-first One Piece TCG collector where Notion pages are the interface, Notion Workers do the automation, and Vault Quartermaster in Slack gives the workspace a conversational front door.

## 0:00–0:20 — Hook
**Say:** "Grand Line Vault turns a Notion workspace into a shared One Piece card vault. I can scan a card, have a Notion Worker recognize it, enrich it with card data and price, save it to my collection, then ask the Notion Agent questions from Slack."

**Show:** Grand Line Vault main Notion page.

## 0:20–0:55 — Scan Inbox magic loop
**Say:** "The main loop starts in Scan Inbox. I upload a card image into the Front image property, leave Status as New, and ask Vault Quartermaster to handle all new scans."

**Do:**
1. Open Scan Inbox.
2. Show a row with `Status = New` and `Front image` populated.
3. In Slack or Notion Agent, ask: `handle all new scans`.

**Expected result:** The row changes to Matched / Needs Review / Rejected. For a good English One Piece card, it creates an Owned Card row.

## 0:55–1:25 — Owned card + collection gallery
**Say:** "The Worker reads the visible card, uses OpenAI vision for recognition, validates it as English, enriches it from OPTCG, and creates an owned copy with image, owner, set, rarity, color, type, and market price."

**Show:**
- The matched Scan Inbox row.
- The linked Owned Card page.
- The Collection Gallery / image wall.

**Callout:** "This is still Notion: the gallery is the binder, the database is the source of truth."

## 1:25–1:55 — Slack Agent questions
**Say:** "Because the collection is in Notion, the Agent can answer collector questions directly from the workspace."

**Ask in Slack:**
- `@Notion AI what card did I just scan?`
- `@Notion AI show my OP-01 cards`
- Follow-up: `which is the most expensive?`

**Expected result:** Vault Quartermaster returns cards with owner, quantity, set/card number, rarity/type, market price, and Notion links.

## 1:55–2:25 — Crew collection and set completion
**Say:** "Grand Line Vault supports multiple owners in the same workspace. Spencer, Jarren, and Waffle can each maintain separate collections while sharing the same master set."

**Show:**
- Owner-filtered views.
- Set Completion dashboard.
- Image-only wall / binder view.
- Wishlist and duplicates if visible.

## 2:25–2:50 — Battle Lab / P1 delight
**Say:** "The second Worker is OP Battle Lab. It reads the same Owned Cards database, builds legal-ish decks for owners, runs Monte Carlo matchups, and writes compact Battle Run history back into Notion."

**Ask:** `Simulate Spencer vs Jarren for 100 battles.`

**Show:** Battle Decks and Battle Runs pages.

## 2:50–3:00 — Close
**Say:** "The important part is that this is Notion-first: pages are the UI, databases are the product model, Workers are the automation layer, and the Agent makes the vault queryable from Slack. That is Grand Line Vault: scan, enrich, collect, query, and battle from one shared workspace."

## Backup prompts
If the live scan is slow, use these instead:

```text
@Vault Quartermaster what card did I just scan?
@Vault Quartermaster show my OP-01 cards
@Vault Quartermaster which SRs am I missing from OP-01?
@Vault Quartermaster summarize Spencer's collection
@Vault Quartermaster list duplicate cards
@Vault Quartermaster simulate Spencer vs Jarren for 100 battles
```

## Demo guardrails
- Use English One Piece cards only.
- Upload images into the `Front image` property, not the page body.
- Use `handleNewScan` for one row.
- Use `handleAllNewScans` for the queue.
- If Notion automation triggers are unavailable, frame this as the intentional manual fallback for hackathon judging.
