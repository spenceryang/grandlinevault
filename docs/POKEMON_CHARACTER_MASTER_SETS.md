# Pokémon Character Master Sets

Per-character master-set boards for **Charizard, Gengar, Pikachu, and Togekiss** — every printing ever, with `Owned` checkboxes feeding a per-character completion roll-up.

The visual hook: **unowned cards render in black-and-white, owned cards render in full color as the gallery cover**. Tick the `Owned` checkbox and the card "lights up" in your gallery wall.

## What's in the catalog (seeded from TCGdex on 2026-05-16)

| Character | Cards |
|---|---|
| **Charizard** | 125 |
| **Pikachu** | 204 |
| **Gengar** | 58 |
| **Togekiss** | 20 |
| **Total** | 407 |

Re-fetch from `https://api.tcgdex.net/v2/en/cards?name=<character>` to refresh.

## How the B&W vs full-color trick works

Each row carries **two image properties**:
- `Owned Image` — the full-color TCGdex art (`https://assets.tcgdex.net/.../<localId>/high.jpg`)
- `Need Image` — the same URL routed through [wsrv.nl](https://wsrv.nl) with `&filt=greyscale` — a free, well-known image proxy that applies a grayscale filter on the fly

Then you set up **two gallery views** in Notion:

- **"Owned Wall"** — Card preview: `Owned Image`, Card size: Large, Fit: **Page cover**, Filter: `Owned = true`. The collector's trophy shelf.
- **"Need List"** — Card preview: `Need Image`, Card size: Large, Fit: **Page cover**, Filter: `Owned = false`. Same cards, rendered in B&W until you check them off.

No formula columns, no re-syncs, no extra image generation pipeline. The user toggles the checkbox in Notion and the card moves between the two views with the right color treatment for free.

## Databases

### `pokemonCharacterMasterSet` — per-card rows

| Property | Type | Notes |
|---|---|---|
| Card Name | title | "Charizard" / "Pikachu V" / etc. |
| Card ID | richText (pk) | TCGdex id, e.g. `swsh1-25` |
| **Character** | select (colored) | Charizard (red) / Gengar (purple) / Pikachu (yellow) / Togekiss (pink) |
| Set ID | richText | TCGdex set id, e.g. `swsh1` |
| Local ID | richText | The card's local number in its set |
| **Owned Image** | file (external URL) | Full-color, gallery-ready |
| **Need Image** | file (external URL) | Greyscale via wsrv.nl |
| **Owned** | checkbox | The collector's truth |

### `pokemonCharacterMasterSetSummary` — per-character roll-up

| Property | Type |
|---|---|
| Character | title (pk) |
| Total Cards | number |
| Owned | number |
| **Completion %** | percent — toggle "Show as bar" |
| Missing | number |

## Recommended Notion page layout

Create one Notion page per character (e.g. "Charizard Master Set"). Each page has:
1. A linked database block of the summary DB filtered to that character — shows the headline completion bar.
2. The "Owned Wall" gallery view filtered to that character — your color collection.
3. The "Need List" gallery view filtered to that character — the B&W chase list.

Duplicate the page for each of the 4 characters. (Future: a single "Pokémon Walls" page that embeds all 4 character-filtered views in one scrollable surface.)

## How to wire it up

```ts
import {
  POKEMON_CHARACTER_MASTER_SET_DATABASE_KEY,
  POKEMON_CHARACTER_MASTER_SET_SUMMARY_DATABASE_KEY,
  pokemonCharacterMasterSetDatabaseConfig,
  pokemonCharacterMasterSetSummaryDatabaseConfig,
} from "./notion/pokemon-character-master-set-database.js";
import {
  buildPokemonMasterSetEntries,
  SUPPORTED_POKEMON_CHARACTERS,
  summarizePokemonMasterSet,
} from "./lib/pokemon-character-master-set.js";
import { getCardsForPokemonCharacter } from "./data/pokemon-character-cards-seed.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";
import * as Builder from "@notionhq/workers/builder";

const masterSet = worker.database(
  POKEMON_CHARACTER_MASTER_SET_DATABASE_KEY,
  pokemonCharacterMasterSetDatabaseConfig,
);
const masterSetSummary = worker.database(
  POKEMON_CHARACTER_MASTER_SET_SUMMARY_DATABASE_KEY,
  pokemonCharacterMasterSetSummaryDatabaseConfig,
);

worker.sync("syncPokemonCharacterMasterSet", {
  database: masterSet,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const owned = await loadOwnedIdSet(context.notion); // see below
    const rows = [];
    for (const character of SUPPORTED_POKEMON_CHARACTERS) {
      const cards = getCardsForPokemonCharacter(character);
      const entries = buildPokemonMasterSetEntries(character, cards, owned);
      for (const e of entries) {
        rows.push({
          type: "upsert" as const,
          key: e.cardId,
          properties: {
            "Card Name": Builder.title(e.name),
            "Card ID": Builder.richText(e.cardId),
            Character: Builder.select(e.character),
            ...(e.localId ? { "Local ID": Builder.richText(e.localId) } : {}),
            "Set ID": Builder.richText(e.cardId.split("-")[0] ?? ""),
            ...(e.colorImageUrl
              ? { "Owned Image": Builder.file(e.colorImageUrl, e.name) }
              : {}),
            ...(e.greyscaleImageUrl
              ? { "Need Image": Builder.file(e.greyscaleImageUrl, `${e.name} (B&W)`) }
              : {}),
            // Don't write Owned — user controls it via Notion checkbox.
            // The Owned-status read happens in the parallel summary sync.
          },
        });
      }
    }
    return { changes: rows, hasMore: false };
  },
});

worker.sync("syncPokemonCharacterMasterSetSummary", {
  database: masterSetSummary,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const owned = await loadOwnedIdSet(context.notion);
    return {
      changes: SUPPORTED_POKEMON_CHARACTERS.map((character) => {
        const cards = getCardsForPokemonCharacter(character);
        const entries = buildPokemonMasterSetEntries(character, cards, owned);
        const summary = summarizePokemonMasterSet(character, entries);
        return {
          type: "upsert" as const,
          key: summary.character,
          properties: {
            Character: Builder.title(summary.character),
            "Total Cards": Builder.number(summary.totalCards),
            Owned: Builder.number(summary.ownedCards),
            "Completion %": Builder.number(summary.completionFraction),
            Missing: Builder.number(summary.missingCount),
          },
        };
      }),
      hasMore: false,
    };
  },
});

async function loadOwnedIdSet(notion: import("@notionhq/client").Client): Promise<Set<string>> {
  const owned = new Set<string>();
  try {
    const rows = await fetchOwnedCards(notion);
    for (const r of rows) owned.add(r.cardId);
  } catch {
    /* degrade gracefully — empty set means everything shows in the Need List */
  }
  return owned;
}
```

The `Owned` column is **not** written by the sync — collectors toggle it manually in Notion. The summary sync reads owned status from the parallel Owned Cards DB to compute completion %.

## Library

`src/lib/pokemon-character-master-set.ts`:
- `SUPPORTED_POKEMON_CHARACTERS` — readonly tuple `["Charizard", "Gengar", "Pikachu", "Togekiss"]`
- `toGreyscaleImageUrl(url)` — wraps any image URL in the wsrv.nl greyscale proxy
- `buildPokemonMasterSetEntries(character, cards, ownedIds)` — entries with both color + greyscale URLs, case-insensitive ownership, sorted by set then local id
- `summarizePokemonMasterSet(character, entries)` — totals + completion %

## Seed

`src/data/pokemon-character-cards-seed.json` — 407 cards total, live-fetched from TCGdex. Re-run the fetch when new sets drop:

```js
node -e '...' // see the PR description for the one-liner fetcher
```

## Tests

9 tests covering: greyscale URL wrapping, null-safe URL handling, dual-URL entry building with case-insensitive ownership, set+localId sorting, per-character completion math, supported-character enum, seed presence per character, seed surface area.

## Future
- Per-character share graphic that says "owned X of N Charizards" — chained PR on top of this one
- Same pattern for One Piece characters (Luffy / Zoro / etc.) using the existing optcgapi catalog
- Auto-refresh the seed via a worker sync that re-queries TCGdex weekly
