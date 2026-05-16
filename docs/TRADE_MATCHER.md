# Trade Matcher

A pure-logic engine that joins **owned-card duplicates** with **other owners' wishlists** and surfaces who could trade what to whom.

If Spencer owns 3 copies of `OP01-003` and Jarren's wishlist has `OP01-003` marked "High", the matcher emits:

> **Spencer → Jarren** — Monkey.D.Luffy (003), 2 available, High priority

Bidirectional matches happen naturally — Jarren's duplicates against Spencer's wishlist appear as separate rows.

## Why this exists

Spreadsheet-and-screenshot trades are friction. Once a workspace has multiple collectors with shared Owned Cards + Wishlists databases, the join becomes free — just compute it. The Trade Matches board surfaces every viable trade so collectors can pick what to propose first.

## What this PR adds

### `src/lib/trade-matcher.ts` — pure logic
- `matchTrades(owned, wishlists)` returns `TradeMatch[]` sorted by priority (`High → Medium → Low → unknown`) then by available quantity desc
- `summarizeTradeMatchesByOwner(matches)` aggregates by `(fromOwner, toOwner)` pair with match count + total available cards
- Matching rules:
  - A card is "tradeable" if `quantity > 1` (you always keep one for yourself; `availableQuantity = quantity - 1`)
  - The same owner's wishlist is **not** matched against their own duplicates
  - `cardId` matching is case-insensitive (`op01-003` matches `OP01-003`)
  - Blank cardIds on either side are skipped

### `src/notion/trade-matches-database.ts` — managed DB
`tradeMatchesDatabaseConfig` — one row per (from, to, card) trade opportunity:

| Property | Type | Notes |
|---|---|---|
| Card Name | title | Denormalized for table-view scanning |
| Match ID | richText (pk) | `{fromOwner}>>{toOwner}>>{cardId}` works as a stable key |
| From Owner / To Owner | richText | Two-way relation candidates if you want to make crew pages |
| Card ID | richText | The matched card |
| Available Quantity | number | `owned.quantity - 1` |
| Priority | select (High/Medium/Low/Unset, colored) | From the wisher's wishlist row |
| Target Price | number ($) | From the wishlist; useful for "is this worth trading?" |
| Status | select (Suggested/Proposed/Accepted/Declined/Completed) | Manual workflow on the receiver's side |

## How to wire it up

```ts
import { fetchOwnedCards } from "./notion/read-owned-cards.js";
import { fetchWishlists } from "./notion/read-wishlists.js"; // <- not yet provided; mirror fetchOwnedCards
import { matchTrades } from "./lib/trade-matcher.js";
import {
  TRADE_MATCHES_DATABASE_KEY,
  tradeMatchesDatabaseConfig,
} from "./notion/trade-matches-database.js";
import * as Builder from "@notionhq/workers/builder";

const tradeMatches = worker.database(
  TRADE_MATCHES_DATABASE_KEY,
  tradeMatchesDatabaseConfig,
);

worker.sync("syncTradeMatches", {
  database: tradeMatches,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const owned = await fetchOwnedCards(context.notion);
    const wishlists = await fetchWishlists(context.notion);
    const matches = matchTrades(owned, wishlists);
    return {
      changes: matches.map((m) => {
        const matchId = `${m.fromOwner}>>${m.toOwner}>>${m.cardId}`;
        return {
          type: "upsert" as const,
          key: matchId,
          properties: {
            "Card Name": Builder.title(m.cardName),
            "Match ID": Builder.richText(matchId),
            "From Owner": Builder.richText(m.fromOwner),
            "To Owner": Builder.richText(m.toOwner),
            "Card ID": Builder.richText(m.cardId),
            "Available Quantity": Builder.number(m.availableQuantity),
            ...(m.priority
              ? { Priority: Builder.select(m.priority) }
              : { Priority: Builder.select("Unset") }),
            ...(typeof m.targetPrice === "number"
              ? { "Target Price": Builder.number(m.targetPrice) }
              : {}),
            Status: Builder.select("Suggested"),
          },
        };
      }),
      hasMore: false,
    };
  },
});
```

A small companion `fetchWishlists` helper isn't in this PR — it would mirror the existing `fetchOwnedCards` against `WISHLISTS_DATA_SOURCE_ID` and project rows into `WishlistRecord`s.

## Recommended Notion views

- **"My Outgoing Trades"** — Table, filter `From Owner = me`, sort by Priority then Available Quantity. Your offer queue.
- **"My Incoming Trades"** — Table, filter `To Owner = me`, sort by Priority. What's available to you.
- **"By Crew Member"** — Board grouped by `To Owner`, card preview optional. See what each crew member could receive.
- **"High Priority Only"** — filter `Priority = High`, sort by `Available Quantity` desc. The "trade these first" view.

## Agent tool sketch

```ts
worker.tool("findMyTrades", {
  title: "Find My Trades",
  description: "Surface duplicate cards I own that other workspace members want.",
  schema: j.object({ ownerName: j.string() }),
  hints: { readOnlyHint: true },
  execute: async ({ ownerName }, context) => {
    const owned = await fetchOwnedCards(context.notion);
    const wishlists = await fetchWishlists(context.notion);
    const all = matchTrades(owned, wishlists);
    return {
      outgoing: all.filter((m) => m.fromOwner === ownerName),
      incoming: all.filter((m) => m.toOwner === ownerName),
    };
  },
});
```

## Future enhancements

- **Bidirectional best-trade detection** — pairs where each side has something the other wants (true 1-for-1 trades)
- **Value balancing** — flag mismatched trade value (one side trading $200 to receive $5)
- **Multi-card bundle suggestions** — "trade these 3 cards for these 2"
- **Geographic filter** — restrict matches to crew members in the same shipping region

The DB schema in this PR doesn't preclude any of these — they slot in as additional rows or extra columns later.
