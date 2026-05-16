# Related / Recommended Cards

Given a card a user just scanned or is browsing, suggest **other cards likely to interest them** — same character, same set, same color identity, same sub-type group, similar cost, similar rarity.

This is the "you might also like" pattern from e-commerce, applied to a TCG collection. Useful for:

- **Deck-building**: "show me other Red Leaders that play in this color identity"
- **Collecting**: "I just got Luffy OP01-003 — what other Luffy printings exist?"
- **Trade discovery**: "find cards in my collection that overlap with this one's sub-types"
- **Agent prompts**: "what cards are like this one but cheaper?"

## What this PR adds

### `src/lib/related-cards.ts` — pure scoring + ranking
- `findRelatedCards(target, candidates, options)` — returns top-N most-related cards from a candidate pool, sorted by score
- `scoreRelatedCard(target, candidate)` — returns `{ score, reasons[] }` for a single pair
- `extractCharacterName(rawName)` — strips trailing parenthetical printing markers (`"Monkey.D.Luffy (003)"` → `"Monkey.D.Luffy"`) so two different prints of the same character match
- `splitColors(value)` and `splitSubTypes(value)` — helpers for multi-color cards (`"Red Green"`) and multi-subtype cards (`"Straw Hat Crew Supernovas"`)

### `src/notion/related-cards-database.ts` — managed DB schema
`relatedCardsDatabaseConfig` — one row per `(sourceCard, relatedCard)` pair. Columns include Source Card ID, Related Card ID, Score, **Reasons (multi-select)** with colored tags for each reason type, and denormalized fields (Image, Set, Color, Cost, Power, Market Price) so the gallery view renders directly without joining.

## Scoring rules

Each relatedness dimension contributes to a sum. Higher score = more related.

| Dimension | Weight | When |
|---|---|---|
| Same character | **+10** | Same name after stripping print suffix |
| Shared sub-types | **+3 per shared tag** | `"Straw Hat Crew"` in both cards' sub_types |
| Same set | **+3** | Same `setId` |
| Same color (per shared color) | **+2 per shared color** | Multi-color cards score multiple times |
| Same card type | **+2** | Both Leaders, both Characters, etc. |
| Cost curve | **+1 to +2** | Equal cost = +2, off by 1 = +1, off by 2+ = 0 |
| Same rarity | **+1** | Both SR, both L, etc. |

Cards with score = 0 are filtered out before returning. The defaults exclude:
- The target card itself (by `cardImageId`)
- All variants of the same base card (by `cardSetId`) — so you don't get 10 Luffy parallels as "recommendations" for a base Luffy

Both exclusions are toggleable via `options.excludeSelf` / `options.excludeSameVariant`.

## Reason vocabulary

Each result includes a `reasons[]` array of:
- `same-character`
- `same-set`
- `same-color`
- `same-type`
- `shared-sub-types`
- `cost-curve`
- `same-rarity`

These match the Notion select chips in the database schema, so the multi-select column auto-color-codes them when rows are written.

## How to wire it up

This PR provides the library and schema. To make it work end-to-end, populate the database with a sync (sketched below — intentionally not in this PR):

```ts
import { listAllOptcgSetCards } from "./providers/optcgapi/list-all-set-cards.js";
import { findRelatedCards } from "./lib/related-cards.js";
import {
  RELATED_CARDS_DATABASE_KEY,
  relatedCardsDatabaseConfig,
} from "./notion/related-cards-database.js";
import * as Builder from "@notionhq/workers/builder";

const relatedCards = worker.database(
  RELATED_CARDS_DATABASE_KEY,
  relatedCardsDatabaseConfig,
);

worker.sync("syncRelatedCards", {
  database: relatedCards,
  mode: "replace",
  schedule: "1d",
  execute: async () => {
    const all = await listAllOptcgSetCards();
    const inputs = all.map((c) => ({
      cardSetId: c.cardSetId,
      cardImageId: c.cardImageId,
      name: c.name,
      setId: c.setId,
      setName: c.setName,
      rarity: c.rarity,
      color: c.color,
      cardType: c.cardType,
      cost: c.cost,
      power: c.power,
      subTypes: c.subTypes,
      marketPrice: c.marketPrice,
      imageUrl: c.imageUrl,
    }));

    const rows = [];
    for (const target of inputs) {
      const related = findRelatedCards(target, inputs, { limit: 8 });
      for (const r of related) {
        const id = `${target.cardImageId}->${r.card.cardImageId}`;
        rows.push({
          type: "upsert" as const,
          key: id,
          properties: {
            "Card Name": Builder.title(r.card.name),
            "Relation ID": Builder.richText(id),
            "Source Card ID": Builder.richText(target.cardImageId),
            "Source Card Name": Builder.richText(target.name),
            "Related Card ID": Builder.richText(r.card.cardImageId),
            "Related Card Image": Builder.url(r.card.imageUrl ?? ""),
            Score: Builder.number(r.score),
            Reasons: Builder.multiSelect(...r.reasons),
            "Related Set": Builder.richText(r.card.setName ?? ""),
            "Related Color": Builder.richText(r.card.color ?? ""),
            "Related Card Type": Builder.richText(r.card.cardType ?? ""),
            "Related Rarity": Builder.richText(r.card.rarity ?? ""),
            ...(typeof r.card.cost === "number"
              ? { "Related Cost": Builder.number(r.card.cost) }
              : {}),
            ...(typeof r.card.power === "number"
              ? { "Related Power": Builder.number(r.card.power) }
              : {}),
            ...(typeof r.card.marketPrice === "number"
              ? { "Related Market Price": Builder.number(r.card.marketPrice) }
              : {}),
          },
        });
      }
    }
    return { changes: rows, hasMore: false };
  },
});
```

Heads up on scale: with ~3,330 cards in the catalog, computing top-8 related per card produces ~26,640 rows. The sync will be slow on first run — consider sharding by set (one sync per `set_id`) if that's a problem.

## Agent tool alternative (no managed DB)

If you don't want the recommendations cached in Notion, this same library works as a live agent tool:

```ts
worker.tool("findRelatedCards", {
  title: "Find Related Cards",
  description: "Suggest cards related to a given One Piece TCG card.",
  schema: j.object({
    cardId: j.string(),
    limit: j.number().nullable(),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ cardId, limit }) => {
    const all = await listAllOptcgSetCards();
    const target = all.find((c) => c.cardImageId === cardId || c.cardSetId === cardId);
    if (!target) throw new Error(`Card not found: ${cardId}`);
    return findRelatedCards(toInput(target), all.map(toInput), {
      limit: limit ?? 8,
    });
  },
});
```

Trade-offs:

- **Cached DB** is faster to query, browsable in Notion gallery view, but a 1-day-old snapshot
- **Live tool** is always current but recomputes the whole index per call

## Recommended Notion views on the database

- **"Cards Like This One"** — Table filtered by `Source Card ID = <card>`, sorted by `Score` desc, visible cols: Card Name, Reasons, Related Cost, Related Market Price
- **"Recommendation Gallery"** — Gallery view, Card preview: `Related Card Image`, filtered the same way
- **"By Reason"** — Board grouped by `Reasons` (any reason chip), card preview Related Card Image

## Future enhancements

- Weight-tuning via deck archetype data (cards seen together in winning decklists become more related)
- Embedding-based similarity using card text (treat each card text as a doc, score via cosine sim)
- Per-user personalization (factor in what the user owns when ranking)

The schema in this PR doesn't preclude any of those — just enrich the row with extra columns later.
