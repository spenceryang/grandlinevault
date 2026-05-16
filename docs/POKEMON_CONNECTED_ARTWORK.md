# Pokémon Connected Artwork — Notion template

Tracks **connected-art card sets** in Pokémon TCG — printings whose illustrations form a single visual scene across 2+ cards. Collectors who chase these (Eeveelution trios, Mew/Mewtwo pairs, Trainer Gallery triptychs, Koraidon/Miraidon pairs, etc.) want one Notion surface that says: "this scene exists, here are the N cards, I own 2 of them, I'm missing 1, here it is."

The data model is borrowed directly from the One Piece **Master Set** template — per-card `Owned` checkboxes feeding a per-set completion roll-up — but scoped to a curated list of connected-art sets rather than every printing in every Pokemon expansion.

## Two databases

### 1. `pokemonConnectedArtwork` — per-card rows
One Notion row per individual card. Properties:

| Property | Type | Notes |
|---|---|---|
| Card Name | title | e.g. `Eevee (Connected Art)` |
| Card ID | richText (pk) | TCGdex card id, e.g. `swsh7-PLACEHOLDER-EEVEE` |
| Set Title | richText | e.g. `Eevee Evolution Trio` |
| Series | richText | TCGdex series, e.g. `Evolving Skies` |
| TCGdex Set ID | richText | e.g. `swsh7` |
| Position | number | 1, 2, 3 — order in the connected scene |
| Image | url | TCGdex image url |
| **Owned** | checkbox | collector toggles when they pull/buy the card |
| Notes | richText | freeform — variant notes, scan provenance |

Recommended Notion views:
- **Card Wall** — Gallery view, card preview Image, group by `Set Title`, sort by `Position`. This is the showcase view — every connected scene rendered as its constituent images in order.
- **Need List** — Table filtered `Owned = false`, sorted by Set Title. The "next cards to chase" view.
- **By Series** — Board grouped by `Series`.

### 2. `pokemonConnectedArtworkSets` — per-set summary
One Notion row per connected-art set. Properties:

| Property | Type | Notes |
|---|---|---|
| Set Title | title | "Eevee Evolution Trio" |
| Set ID | richText (pk) | our internal stable id, e.g. `swsh-evolving-skies-eevee-trio` |
| Series | richText | TCGdex series |
| TCGdex Set ID | richText | e.g. `swsh7` |
| Total Cards | number | how many constituent cards |
| Owned | number | how many of those the collector owns |
| **Completion %** | number (percent) | toggle "Show as bar" or "Show as ring" for the cool per-set progress visualization |
| **Complete** | checkbox | true when Owned = Total |
| Missing Card IDs | richText | comma list, mostly for table-view scanning |

Recommended views:
- **Completion Wall** — Table sorted by Completion % desc with the bar visualization on.
- **Mark as Complete** — Filter `Complete = true`, sorted by Series. Trophy shelf of finished scenes.
- **Closest to Done** — Filter `Complete = false AND Completion % >= 0.5`, sorted by Completion % desc. The "one push to finish" view.

## What this PR adds

### `src/lib/pokemon-connected-artwork.ts`
- `ConnectedArtworkSet` + `ConnectedArtworkCard` types
- `buildOwnershipRows(sets, ownedIds)` → per-card rows with `Owned` flag
- `summarizeConnectedArtworkSets(sets, ownedIds)` → per-set summaries with `completionFraction`, `complete`, `missingCardIds`
- `findIncompleteSets(sets, ownedIds, threshold?)` — filter helper for "what's not done yet"

### `src/data/pokemon-connected-artwork-seed.json` + `.ts`
Five seeded **placeholder** connected-art sets (TCGdex card ids are guesses — confirm against `https://api.tcgdex.net/v2/en/cards` before going live):
- Eevee Evolution Trio (Evolving Skies, swsh7)
- Charizard Trainer Gallery Triptych (Brilliant Stars, swsh9)
- Mew V / Mewtwo V Pair (Fusion Strike, swsh8)
- Koraidon / Miraidon Pair (Paldea Evolved, sv02)
- Shiny Eevee Evolution Lineup (Hidden Fates, sm115)

Each placeholder is labeled `PLACEHOLDER-*` in the card id so it's obvious they need confirmation. Add real ids by editing the JSON in place — the worker sync picks up the change without code edits.

### `src/notion/pokemon-connected-artwork-database.ts`
Both database configs (`pokemonConnectedArtworkDatabaseConfig` + `pokemonConnectedArtworkSetsDatabaseConfig`) ready to pass into `worker.database(...)`.

## How to wire it up

```ts
import {
  POKEMON_CONNECTED_ARTWORK_DATABASE_KEY,
  POKEMON_CONNECTED_ARTWORK_SETS_DATABASE_KEY,
  pokemonConnectedArtworkDatabaseConfig,
  pokemonConnectedArtworkSetsDatabaseConfig,
} from "./notion/pokemon-connected-artwork-database.js";
import { getPokemonConnectedArtworkSets } from "./data/pokemon-connected-artwork-seed.js";
import {
  buildOwnershipRows,
  summarizeConnectedArtworkSets,
} from "./lib/pokemon-connected-artwork.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";
import * as Builder from "@notionhq/workers/builder";

const connectedArt = worker.database(
  POKEMON_CONNECTED_ARTWORK_DATABASE_KEY,
  pokemonConnectedArtworkDatabaseConfig,
);
const connectedArtSets = worker.database(
  POKEMON_CONNECTED_ARTWORK_SETS_DATABASE_KEY,
  pokemonConnectedArtworkSetsDatabaseConfig,
);

worker.sync("syncPokemonConnectedArtwork", {
  database: connectedArt,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const sets = getPokemonConnectedArtworkSets();
    const owned = new Set<string>();
    try {
      const ownedCards = await fetchOwnedCards(context.notion);
      for (const c of ownedCards) owned.add(c.cardId);
    } catch {
      // degrade gracefully — empty set means everything shows as not-owned
    }
    const rows = buildOwnershipRows(sets, owned);
    return {
      changes: rows.map((r) => ({
        type: "upsert" as const,
        key: r.cardId,
        properties: {
          "Card Name": Builder.title(r.cardName),
          "Card ID": Builder.richText(r.cardId),
          "Set Title": Builder.richText(r.setTitle),
          Series: Builder.richText(r.series),
          Position: Builder.number(r.position),
          ...(r.imageUrl ? { Image: Builder.url(r.imageUrl) } : {}),
          Owned: Builder.checkbox(r.owned),
        },
      })),
      hasMore: false,
    };
  },
});

worker.sync("syncPokemonConnectedArtworkSets", {
  database: connectedArtSets,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const sets = getPokemonConnectedArtworkSets();
    const owned = new Set<string>();
    try {
      const ownedCards = await fetchOwnedCards(context.notion);
      for (const c of ownedCards) owned.add(c.cardId);
    } catch {}
    const summaries = summarizeConnectedArtworkSets(sets, owned);
    return {
      changes: summaries.map((s) => ({
        type: "upsert" as const,
        key: s.id,
        properties: {
          "Set Title": Builder.title(s.title),
          "Set ID": Builder.richText(s.id),
          Series: Builder.richText(s.series),
          ...(s.setId ? { "TCGdex Set ID": Builder.richText(s.setId) } : {}),
          "Total Cards": Builder.number(s.totalCards),
          Owned: Builder.number(s.ownedCards),
          "Completion %": Builder.number(s.completionFraction),
          Complete: Builder.checkbox(s.complete),
          "Missing Card IDs": Builder.richText(s.missingCardIds.join(", ")),
        },
      })),
      hasMore: false,
    };
  },
});
```

## Why placeholders for the card data

Pokemon TCG has thousands of cards. There's no public dataset I know of that tags "these N cards form one connected scene." Until someone curates it (community effort, or hand-curated by a collector), the seed file is the curation surface — small enough to maintain in JSON, big enough to render the template.

Five placeholder sets are seeded to make the schema demoable; collectors swap in real card ids as they confirm them in TCGdex.

## Tests
9 tests covering: per-card row construction with sort order, case-insensitive ownership matching, per-set summary math (complete + partial + 0%), sort-by-completion-desc, `findIncompleteSets` filter (custom threshold + default behavior), seed JSON well-formedness, seed surface area (≥3 sets), graceful empty-owned handling.

## Future enhancements

- **Image enrichment from TCGdex** — when a card id is confirmed, run it through `getTcgdexCard(id)` and store the image URL in the seed automatically.
- **Auto-seed from TCGdex tags** — TCGdex may eventually expose connected-art metadata (e.g. an `illustration_group` field). Swap the static JSON for a live lookup.
- **Per-owner views** — pivot the per-card DB by Owner to see whose collection is closest on each scene.
- **Community submissions** — a Notion form (or the existing Resend inbound) that lets crew members propose new connected-art sets to add to the seed.
