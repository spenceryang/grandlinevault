# Price Movers

Computes top gainers and losers over a rolling window using the existing `priceSnapshots` database.

If `syncOptcgPriceSnapshots` has been running daily, every card has a price history. `computePriceMovers(snapshots, { windowDays: 7 })` produces:

> **Top Gainers (7d)**
> 1. OP01-003 (Luffy Leader Parallel): $355.88 → $402.10 (+12.99%, +$46.22)
> 2. ...
>
> **Top Losers (7d)**
> 1. OP13-118 (Luffy Red Super Alt Art): $8,489.98 → $7,200.00 (-15.19%, -$1,289.98)

## What this PR adds

### `src/lib/price-movers.ts` — pure logic
- `computePriceMovers(snapshots, options)` → `PriceMoverReport`
- Options:
  - `windowDays` (default `7`) — comparison window
  - `now` (default `new Date()`) — useful for tests + back-fills
  - `limit` (default `10`) — top-N gainers and losers
  - `minOldPrice` (default `$1`) — filters out noisy penny cards (a $0.10 → $1.00 move isn't interesting)
- Behavior:
  - Groups snapshots by `cardId`
  - For each card, picks the latest snapshot AND the most recent snapshot ≤ `now - windowDays` as the baseline
  - Falls back to the earliest available snapshot if no snapshot predates the cutoff (handles newly-tracked cards gracefully)
  - Skips cards with only one snapshot, zero-delta moves, or sub-`minOldPrice` baselines
  - Returns gainers sorted by `percentChange` desc, losers sorted by `percentChange` asc

### `src/notion/price-movers-database.ts` — managed DB
`priceMoversDatabaseConfig` — one row per mover with: Card Name (title), Mover ID (pk `{cardId}:{direction}:{window}`), Card ID, Direction (select Gainer/Loser, colored), Window (days), Old Price ($), New Price ($), **Dollar Change ($)**, **Percent Change (percent)** — toggle "Show as bar" for a visualization of the move size, Old Captured At (date), New Captured At (date).

## How to wire it up

Combine with the existing `priceSnapshots` data (no new API calls needed):

```ts
import { computePriceMovers } from "./lib/price-movers.js";
import {
  PRICE_MOVERS_DATABASE_KEY,
  priceMoversDatabaseConfig,
} from "./notion/price-movers-database.js";
import { readPriceSnapshots } from "./notion/read-price-snapshots.js"; // not yet provided; mirrors fetchOwnedCards
import * as Builder from "@notionhq/workers/builder";

const priceMovers = worker.database(
  PRICE_MOVERS_DATABASE_KEY,
  priceMoversDatabaseConfig,
);

worker.sync("syncPriceMovers", {
  database: priceMovers,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const snapshots = await readPriceSnapshots(context.notion);
    const sevenDay = computePriceMovers(snapshots, { windowDays: 7 });
    const thirtyDay = computePriceMovers(snapshots, { windowDays: 30 });
    const rows = [
      ...sevenDay.topGainers.map((m) => row(m, "Gainer", 7)),
      ...sevenDay.topLosers.map((m) => row(m, "Loser", 7)),
      ...thirtyDay.topGainers.map((m) => row(m, "Gainer", 30)),
      ...thirtyDay.topLosers.map((m) => row(m, "Loser", 30)),
    ];
    return { changes: rows, hasMore: false };
  },
});

function row(m, direction, window) {
  const moverId = `${m.cardId}:${direction}:${window}d`;
  return {
    type: "upsert" as const,
    key: moverId,
    properties: {
      "Card Name": Builder.title(m.cardId),
      "Mover ID": Builder.richText(moverId),
      "Card ID": Builder.richText(m.cardId),
      Direction: Builder.select(direction),
      "Window (days)": Builder.number(window),
      "Old Price": Builder.number(m.oldPrice),
      "New Price": Builder.number(m.newPrice),
      "Dollar Change": Builder.number(m.dollarChange),
      "Percent Change": Builder.number(m.percentChange / 100), // percent format expects 0-1
      "Old Captured At": Builder.date(m.oldCapturedAt.slice(0, 10)),
      "New Captured At": Builder.date(m.newCapturedAt.slice(0, 10)),
    },
  };
}
```

A small `readPriceSnapshots` helper would mirror `fetchOwnedCards` against `priceSnapshots`'s data source and project rows into the `PriceSnapshotInput` shape.

## Recommended Notion views

- **"Top Gainers (7d)"** — Table filtered `Direction = Gainer AND Window = 7`, sort by Percent Change desc. The "what's hot" dashboard.
- **"Top Losers (7d)"** — same with Loser, sort asc. The "watch for buying opportunities" view.
- **"Movers Wall"** — Gallery, card preview via a linked Card Catalog image, group by Direction.
- **"30-Day Trends"** — Same as above but `Window = 30`.

## Agent tool sketch

```ts
worker.tool("priceMovers", {
  title: "Price Movers",
  description: "Top gainers and losers over a window. Default window is 7 days.",
  schema: j.object({
    windowDays: j.number().nullable(),
    limit: j.number().nullable(),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ windowDays, limit }, context) => {
    const snapshots = await readPriceSnapshots(context.notion);
    return computePriceMovers(snapshots, {
      windowDays: windowDays ?? 7,
      limit: limit ?? 10,
    });
  },
});
```

## Edge cases handled

- Multiple snapshots on the same day → uses the latest
- Newly-tracked card (no snapshot predates the cutoff) → falls back to the earliest available baseline so the card still shows up
- Penny cards (baseline < $1 by default) → filtered out to keep the dashboard signal-heavy
- Zero-delta moves → not listed (they're not "movers")
- Limit → capped per direction (e.g. `limit: 5` gives 5 gainers AND 5 losers = 10 rows total)

## Future enhancements

- Volatility band (cards that moved a lot in either direction)
- Streak detection (5 consecutive days of gain)
- Per-set movers (top OP-13 movers this week)
- Tie-break by `dollarChange` desc when `percentChange` is equal
- Use multiple `Source` columns (OPTCG vs PriceCharting) for cross-feed comparison once that's wired
