# Wishlist Insights

The existing **Wishlist** database lets collectors mark "I want this card." This PR turns that flat list into an **actionable** surface — price tracking, budget rollups, "buy it now" recommendations when targets get hit, and auto-suggestions sourced from master-set completion gaps.

## What this PR adds

### `src/lib/wishlist-insights.ts` — pure logic

- **`enrichWishlist(items, marketPrices)`** → `EnrichedWishlistItem[]` — joins each wishlist row with the current market price and emits:
  - `currentMarketPrice`
  - `dollarsBelowTarget` (positive = under target)
  - `percentBelowTarget`
  - `targetHit` boolean
- **`summarizeWishlistBudget(items, ownerName)`** → `WishlistBudget` — per-owner totals: open items, total target spend, total current spend, savings/cost vs target
- **`findNextPurchases(items, ownerName, limit?)`** → `WishlistRecommendation[]` — sorted list of "buy these now" candidates: target hit, highest priority, cheapest first
- **`suggestWishlistFromMasterSet(missingCards, existingWishlistIds, options?)`** → `WishlistSuggestion[]` — given missing cards from a master set (or the One Piece master-set DB or the Pokemon character master-set DB), proposes wishlist additions excluding cards already wished for

### Two managed Notion DBs

**`wishlistInsights`** — one row per (owner, card) wishlist entry, enriched with live pricing:

| Property | Type | Notes |
|---|---|---|
| Card Name | title | |
| Insight ID | richText (pk) | `{owner}:{cardId}` |
| Owner, Card ID | richText | |
| Priority | select (High/Medium/Low/Unset, colored) | |
| Status | select (Open/Snoozed/Acquired, colored) | |
| Target Price | number ($) | from the user-managed Wishlist |
| **Current Market Price** | number ($) | computed |
| **Dollars Below Target** | number ($) | positive = under target, negative = over |
| **Percent Below Target** | number (percent) | toggle "Show as bar" for a per-item visualization of how close you are to your target |
| **Target Hit** | checkbox | true = ready to buy |
| Reason | richText | freeform notes |

**`wishlistBudget`** — per-owner roll-up:

| Property | Type |
|---|---|
| Owner | title (pk) |
| Open Items, Total Items | number |
| **Total Target Spend** | dollar |
| **Total Current Spend** | dollar |
| **Savings at Target** | dollar — positive = you'd save vs current, negative = your targets are below market |

## How to wire it up

```ts
import {
  WISHLIST_INSIGHTS_DATABASE_KEY,
  WISHLIST_BUDGET_DATABASE_KEY,
  wishlistInsightsDatabaseConfig,
  wishlistBudgetDatabaseConfig,
} from "./notion/wishlist-insights-database.js";
import {
  enrichWishlist,
  findNextPurchases,
  summarizeWishlistBudget,
} from "./lib/wishlist-insights.js";

worker.sync("syncWishlistInsights", {
  database: wishlistInsights,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const wishlistItems = await fetchWishlists(context.notion);   // follow-up reader
    const marketPrices = await loadMarketPrices(context.notion);  // follow-up reader
    const enriched = enrichWishlist(wishlistItems, marketPrices);
    return {
      changes: enriched.map((e) => ({
        type: "upsert" as const,
        key: `${e.ownerName}:${e.cardId}`,
        properties: {
          "Card Name": Builder.title(e.cardName),
          "Insight ID": Builder.richText(`${e.ownerName}:${e.cardId}`),
          Owner: Builder.richText(e.ownerName),
          "Card ID": Builder.richText(e.cardId),
          Priority: Builder.select(e.priority),
          Status: Builder.select(e.status ?? "Open"),
          ...(e.targetPrice !== null
            ? { "Target Price": Builder.number(e.targetPrice) }
            : {}),
          ...(e.currentMarketPrice !== null
            ? { "Current Market Price": Builder.number(e.currentMarketPrice) }
            : {}),
          ...(e.dollarsBelowTarget !== null
            ? { "Dollars Below Target": Builder.number(e.dollarsBelowTarget) }
            : {}),
          ...(e.percentBelowTarget !== null
            ? {
                "Percent Below Target": Builder.number(
                  e.percentBelowTarget / 100,
                ),
              }
            : {}),
          "Target Hit": Builder.checkbox(e.targetHit),
          Reason: Builder.richText(e.reason ?? ""),
        },
      })),
      hasMore: false,
    };
  },
});
```

`fetchWishlists` mirrors the existing `fetchOwnedCards` pattern against `WISHLISTS_DATA_SOURCE_ID`. `loadMarketPrices` reads the latest entry per `cardId` from the existing `priceSnapshots` DB. Both are tiny follow-up readers.

## Agent tools the user can ask in Slack

After the sync runs:

- **"What should I buy from my wishlist?"** — agent calls `findNextPurchases(enriched, ownerName, 5)` → returns the prioritized buy queue with reasons like `High priority · $12.55 below your $50.00 target`.
- **"What's my wishlist budget?"** — agent reads `wishlistBudget` for the owner → returns target vs current spend.
- **"Add my missing OP-05 cards to my wishlist"** — agent calls `suggestWishlistFromMasterSet(missing, existingIds, { defaultPriority: "Medium" })` then writes the suggestions back to the user-managed Wishlist DB.

## Recommended Notion views

- **"Buy It Now"** — Table filtered `Target Hit = true AND Status = Open`, sorted by Priority + Percent Below Target desc. The "you can pull the trigger" queue.
- **"Waiting for Price"** — Filter `Target Hit = false`, sorted by Percent Below Target desc. Cards that are close but not there yet.
- **"Wall of Wants"** — Gallery view (after a future PR joins the Catalog DB on Card ID for images), grouped by Priority.
- **"Budget Snapshot"** — On the `wishlistBudget` DB, table sorted by Total Target Spend desc.

## Recommended Slack agent prompts

```
@Notion AI what should I buy from my wishlist?
@Notion AI what's my wishlist budget?
@Notion AI which wishlist cards just hit target this week?
@Notion AI add my missing OP-05 cards to my wishlist
```

## Tests
11 tests covering: target delta math, targetHit threshold, case-insensitive id matching, missing-price/missing-target safety, per-owner budget tally with Acquired exclusion, priority+price recommendation sort, Acquired skip in recommendations, limit enforcement, master-set suggestion deduplication, suggestion price-asc sort, custom default priority + limit, budget with null target.

All tests pass (`npm test`, `npm run typecheck` both green).

## Not in this PR
- The two reader helpers (`fetchWishlists` and `loadMarketPrices`) — small Notion-side reads that mirror existing patterns; future PR.
- Agent tool registrations — kept as pure library + template per the established pattern. Wiring snippets in this doc.
- A "wishlist alert" — Resend outbound email when a Target Hit happens — future PR (the outbound library from #30 makes this a few lines).
