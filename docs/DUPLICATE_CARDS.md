# Duplicate Cards Dashboard

The existing `listDuplicateCards` agent tool answers the question once. This PR turns that one-shot output into a **persistent dashboard board** in Notion — every duplicate card is a row with quantity, tradeable count, market price, total value, and a Status (Keep / Trade / Sell / Gift) the user can update over time.

Per-owner summary roll-up shows headline totals: how many unique duplicate cards you have, how many tradeable copies, and how much money is sitting in your duplicate pile vs how much is liquid (everything beyond the one copy you keep).

## What this PR adds

### `src/lib/duplicate-insights.ts` — pure logic

- **`enrichDuplicates(cards, marketPrices?)`** — filters singletons out, joins market prices (case-insensitive on `cardId`), computes:
  - `availableCount = quantity - 1` (you always keep one for yourself)
  - `totalValue = price × quantity`
  - `tradeableValue = price × availableCount`
  - Sorted by `tradeableValue` desc, then `availableCount` desc
- **`findTradableDuplicates(enriched, { minAvailable?, ownerName? })`** — filter helper for "show me cards I have ≥2 extras of" or "show me Spencer's tradeables only"
- **`summarizeDuplicatesByOwner(enriched)`** — per-owner totals: unique cards, copies, tradeable copies, total $, tradeable $. Sorted by tradeable value desc.

### Two managed Notion DBs

**`duplicateCards`** — one row per `(owner, card)` duplicate:

| Property | Type | Notes |
|---|---|---|
| Card Name | title | |
| Duplicate ID | richText (pk) | `{owner}:{cardId}` |
| Owner | richText | |
| Card ID | richText | |
| **Total Owned** | number | |
| **Available Count** | number | `quantity - 1` |
| Current Market Price | dollar | |
| Total Value | dollar | full pile |
| **Tradeable Value** | dollar | available copies only |
| **Status** | select (Keep / Trade / Sell / Gift, colored) | the collector toggles as they decide |

**`duplicateOwnerSummary`** — per-owner roll-up:

| Property | Type |
|---|---|
| Owner | title (pk) |
| Unique Duplicate Cards | number |
| Total Duplicate Copies | number |
| Total Tradeable Copies | number |
| **Total Duplicate Value** | dollar |
| **Total Tradeable Value** | dollar |

## How to wire it up

```ts
import {
  DUPLICATE_CARDS_DATABASE_KEY,
  DUPLICATE_OWNER_SUMMARY_DATABASE_KEY,
  duplicateCardsDatabaseConfig,
  duplicateOwnerSummaryDatabaseConfig,
} from "./notion/duplicate-cards-database.js";
import {
  enrichDuplicates,
  summarizeDuplicatesByOwner,
} from "./lib/duplicate-insights.js";

worker.sync("syncDuplicateCards", {
  database: duplicateCards,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const owned = await fetchOwnedCards(context.notion);
    const prices = await loadMarketPrices(context.notion); // follow-up reader
    const enriched = enrichDuplicates(owned, prices);
    return {
      changes: enriched.map((d) => ({
        type: "upsert" as const,
        key: `${d.ownerName}:${d.cardId}`,
        properties: {
          "Card Name": Builder.title(d.cardName),
          "Duplicate ID": Builder.richText(`${d.ownerName}:${d.cardId}`),
          Owner: Builder.richText(d.ownerName),
          "Card ID": Builder.richText(d.cardId),
          "Total Owned": Builder.number(d.quantity),
          "Available Count": Builder.number(d.availableCount),
          ...(d.currentMarketPrice !== null
            ? { "Current Market Price": Builder.number(d.currentMarketPrice) }
            : {}),
          ...(d.totalValue !== null
            ? { "Total Value": Builder.number(d.totalValue) }
            : {}),
          ...(d.tradeableValue !== null
            ? { "Tradeable Value": Builder.number(d.tradeableValue) }
            : {}),
          // Status is intentionally not written — the user toggles it manually.
        },
      })),
      hasMore: false,
    };
  },
});
```

The Status column is **not** written by the sync — the collector toggles it as they decide what to do with each duplicate pile. Existing values persist across sync runs.

## Recommended Notion views

- **"Trade Block"** — table filtered `Status = Trade`, sorted by `Tradeable Value` desc. The "what to bring to the next meetup" list.
- **"Sell Pile"** — filter `Status = Sell`, sort by `Tradeable Value` desc. The eBay/marketplace queue.
- **"Gift Stash"** — filter `Status = Gift`. Cards earmarked for friends.
- **"Inbox"** — filter `Status` is empty AND `Available Count >= 2`. Cards you have lots of that you haven't classified yet.
- **"By Owner"** — board grouped by `Owner`, card preview optional via a future join with the Catalog DB.
- **"High Value Duplicates"** — table sorted by `Tradeable Value` desc. The "$1000 in duplicate Luffys" view.

## Slack agent prompts this makes possible

- *"What are my most valuable duplicates?"* → top rows from `duplicateCards` filtered by owner.
- *"How much is in my trade pile?"* → `duplicateOwnerSummary` row, "Total Tradeable Value" field.
- *"Mark every duplicate worth less than $1 as Sell"* → bulk update Status.

## Connection to existing tooling

- The existing `listDuplicateCards` agent tool (in `src/index.ts`) still works — it's the one-shot query. This PR adds the persistent dashboard layer.
- The **Trade Matcher** (PR #28) reads from the same `quantity - 1` rule to compute available counts. Both surfaces use the same logic.

## Tests
10 tests covering: singleton filtering, `availableCount` math, case-insensitive price matching, null-safe pricing, sort order (tradeable value desc, then available count desc), `minAvailable` filter, owner filter, per-owner summary aggregation, owner sort by tradeable value, all-singleton edge case.

All tests pass (`npm test`, `npm run typecheck` both green).

## Draft
Per direction, this is a **draft PR** — review the dashboard shape + recommended views before landing.

## Not in this PR
- The `loadMarketPrices` reader from `priceSnapshots` — small Notion-side reader, follow-up.
- `worker.sync` registrations — pure library + template per the established pattern. Wiring snippets in this doc.
- An "auto-trade-block" sync that toggles `Status = Trade` on every duplicate worth > $20 — future enhancement.
EOF
