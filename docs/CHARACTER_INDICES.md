# Character Indices

Generalizes the Luffy Index ETF concept to a small library of character/faction indices: **Luffy, Zoro, Sanji, Nami, Strawhat, Yonko, Donquixote** — each a price-weighted index of every matching card printing.

Same methodology as the Luffy Index (price-weighted, top-N holdings, concentration analysis). One library, one Notion database, every character renders as a filtered view.

## What this PR adds

### `src/lib/character-index.ts`
- **Patterns** — exported regex arrays per character:
  - `LUFFY_PATTERNS`, `ZORO_PATTERNS`, `SANJI_PATTERNS`, `NAMI_PATTERNS`, `USOPP_PATTERNS`, `CHOPPER_PATTERNS`, `ROBIN_PATTERNS`, `FRANKY_PATTERNS`, `BROOK_PATTERNS`, `JINBE_PATTERNS`
  - `STRAWHAT_PATTERNS` — union of all 10 crew members
  - `YONKO_PATTERNS` — Kaido, Big Mom (Charlotte Linlin), Shanks, Blackbeard (Marshall.D.Teach), Whitebeard (Edward Newgate), Luffy (current Yonko-tier)
  - `DONQUIXOTE_PATTERNS` — Doflamingo + Corazon + Donquixote family
- `CHARACTER_INDEX_REGISTRY` — the named registry mapping label → patterns. Add your own with one line: `{ "Kid": KID_PATTERNS }`.
- `matchesAnyPattern(name, patterns)` — boolean helper
- `buildCharacterIndex(character, cards, patterns)` — returns price-weighted entries sorted by market price desc, weights sum to 1.0
- `summarizeCharacterIndex(character, entries, topN?)` → `{ holdings, totalMarketValue, averagePrice, maxPrice, topHoldings[] }`
- `buildAllRegisteredIndices(cards, registry?)` — convenience to populate every named index in a single pass

### `src/notion/character-index-database.ts`
`characterIndexDatabaseConfig` — single managed DB with all character entries combined. Properties: Name (title), Entry ID (pk, e.g. `Luffy:OP01-003_p1`), **Character (select with 7 colored chips)**, Variant ID, Base Card ID, Set ID/Name, Variant (base/parallel/alt-art/promo, colored), Rarity, Card Type, Market Price ($), **Index Weight (percent — bar/ring renderable)**, Image, Owned (checkbox).

## How to wire it up

```ts
import { worker } from "./worker.js";
import {
  CHARACTER_INDEX_DATABASE_KEY,
  characterIndexDatabaseConfig,
} from "./notion/character-index-database.js";
import {
  buildAllRegisteredIndices,
  CHARACTER_INDEX_REGISTRY,
} from "./lib/character-index.js";
import { listAllOptcgSetCards } from "./providers/optcgapi/list-all-set-cards.js";
import * as Builder from "@notionhq/workers/builder";

const characterIndex = worker.database(
  CHARACTER_INDEX_DATABASE_KEY,
  characterIndexDatabaseConfig,
);

worker.sync("syncCharacterIndices", {
  database: characterIndex,
  mode: "replace",
  schedule: "1d",
  execute: async () => {
    const cards = await listAllOptcgSetCards();
    const source = cards.map((c) => ({
      card_set_id: c.cardSetId,
      card_image_id: c.cardImageId,
      card_name: c.name,
      set_id: c.setId,
      set_name: c.setName,
      rarity: c.rarity,
      card_color: c.color,
      card_type: c.cardType,
      card_image: c.imageUrl,
      market_price: c.marketPrice,
    }));
    const indices = buildAllRegisteredIndices(source);
    const rows = [];
    for (const [character, entries] of Object.entries(indices)) {
      for (const e of entries) {
        const entryId = `${character}:${e.variantId}`;
        rows.push({
          type: "upsert" as const,
          key: entryId,
          properties: {
            Name: Builder.title(e.name),
            "Entry ID": Builder.richText(entryId),
            Character: Builder.select(character),
            "Variant ID": Builder.richText(e.variantId),
            "Base Card ID": Builder.richText(e.baseCardId),
            "Set ID": Builder.richText(e.setId ?? ""),
            "Set Name": Builder.richText(e.setName ?? ""),
            Variant: Builder.select(e.variant),
            Rarity: Builder.richText(e.rarity ?? ""),
            "Card Type": Builder.richText(e.cardType ?? ""),
            "Market Price": Builder.number(e.marketPrice),
            "Index Weight": Builder.number(e.weight),
            Image: Builder.url(e.imageUrl),
            Owned: Builder.checkbox(false),
          },
        });
      }
    }
    return { changes: rows, hasMore: false };
  },
});
```

## Recommended Notion views (one DB, many lenses)

- **"Luffy Index"** — filter `Character = Luffy`, sort `Index Weight` desc, gallery preview Image
- **"Zoro Index"** — same with Zoro
- **"Strawhat Crew Index"** — filter `Character = Strawhat`, sort by weight desc
- **"Yonko Index"** — filter `Character = Yonko`
- **"Donquixote Index"** — filter `Character = Donquixote`
- **"Compare All Characters"** — board grouped by Character, count rows per group
- **"Most Valuable Across Indices"** — sort Market Price desc, no filter — the top-N expensive printings across every tracked character

Toggle `Index Weight` to "Show as bar" on each filtered view for the cool per-character progress visualization.

## Extending with new characters

Add a constant + one registry line:

```ts
export const KID_PATTERNS: ReadonlyArray<RegExp> = [
  /Eustass[\s.]*"?Captain"?[\s.]*Kid/i,
  /\bEustass Kid\b/i,
];

// then add to CHARACTER_INDEX_REGISTRY:
CHARACTER_INDEX_REGISTRY.Kid = KID_PATTERNS;

// and add a colored chip to the Notion DB's Character select if you want UI distinction.
```

## Future enhancements

- Crew sub-indices: "Heart Pirates Index" (Law + crew), "Whitebeard Pirates Index" (Edward + Marco + Ace + ...)
- Per-color-identity views (Red Luffys only)
- Cross-character co-occurrence (cards depicting multiple Strawhats, scored against multiple indices)
- Index momentum: snapshot the totalMarketValue daily and chart it (uses the same price-snapshot history as the Price Movers PR)

The library doesn't preclude any of these — slot in additional named registry entries or extra summary functions.
