# Character master set share graphic

A 1200×630 SVG that lets a collector **flex how many of N Charizards** (or Pikachus / Gengars / Togekisses) they own. Same shape as the Vault-level share graphic from PR #41, but specialized for one character master set with:

- Big headline: `Spencer's 42 of 125`
- A filled progress bar in the character's signature color (Charizard fire-orange, Pikachu yellow, Gengar purple, Togekiss pink)
- Up to 5 owned cards in full color along the bottom, distributed across the catalog so the strip spans your collection range
- Footer: public Notion URL + tagline

Drop it into iMessage, Discord, X/Twitter, a Notion image block, or rasterize to PNG for chat clients that prefer it.

## What this PR adds

### `src/lib/character-master-set-share-graphic.ts`
- `buildCharacterMasterSetSvg(input, options?)` → SVG string
- `pickHighlightCards(entries, count)` → evenly-distributed owned cards from the master set entries
- `CHARACTER_ACCENTS` — per-character color map (Charizard `#ff7547`, Gengar `#9b59ff`, Pikachu `#ffd23f`, Togekiss `#f7b1d0`)

### Input shape

```ts
type CharacterMasterSetShareInput = {
  character: string;              // "Charizard" | "Gengar" | "Pikachu" | "Togekiss" | …
  totalCards: number;
  ownedCards: number;
  notionPublicUrl: string;
  collectorName?: string | null;  // "Spencer's 42 of 125"
  highlightCards?: PokemonMasterSetEntry[];  // up to maxHighlightCards (default 5) rendered as image strip
  generatedAt?: Date;
  tagline?: string | null;
};
```

### Options

```ts
type CharacterMasterSetShareOptions = {
  width?: number;          // default 1200
  height?: number;         // default 630
  background?: string;     // default #0c0e16
  accent?: string;         // default: CHARACTER_ACCENTS[character]
  textColor?: string;      // default #f4f4f5
  maxHighlightCards?: number;  // default 5
};
```

Override `accent` to render the same character in a custom palette (event-themed, seasonal, crew-themed, etc.).

## How to wire it as an agent tool

```ts
import {
  buildCharacterMasterSetSvg,
  pickHighlightCards,
} from "./lib/character-master-set-share-graphic.js";
import {
  buildPokemonMasterSetEntries,
  summarizePokemonMasterSet,
} from "./lib/pokemon-character-master-set.js";
import { getCardsForPokemonCharacter } from "./data/pokemon-character-cards-seed.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";

worker.tool("shareCharacterMasterSet", {
  title: "Share Character Master Set",
  description: "Generate a graphic that flexes how many Charizards (or other character) you own.",
  schema: j.object({
    character: j.string(),
    collectorName: j.string().nullable(),
    notionPublicUrl: j.string(),
    highlightCount: j.number().nullable(),
  }),
  execute: async ({ character, collectorName, notionPublicUrl, highlightCount }, context) => {
    const cards = getCardsForPokemonCharacter(character as any);
    const owned = new Set<string>();
    try {
      const ownedCards = await fetchOwnedCards(context.notion);
      for (const c of ownedCards) owned.add(c.cardId);
    } catch {}
    const entries = buildPokemonMasterSetEntries(character, cards, owned);
    const summary = summarizePokemonMasterSet(character, entries);
    const highlights = pickHighlightCards(entries, highlightCount ?? 5);
    const svg = buildCharacterMasterSetSvg({
      character,
      totalCards: summary.totalCards,
      ownedCards: summary.ownedCards,
      notionPublicUrl,
      collectorName,
      highlightCards: highlights,
    });
    return { svg, summary };
  },
});
```

Now a collector can ask the agent: *"Make me a Charizard master set share graphic, my Notion is https://… my name is Spencer"* and get back a sharable SVG + the underlying stats.

## XSS safety

The function HTML-escapes all user-controlled text (character, collectorName, tagline) before injection. Test asserts this — a name like `Spencer's` correctly renders as `Spencer&#39;s` not as a stray apostrophe in the SVG.

## Tests

10 tests covering: uppercase character title, owned/total ratio embedding, public Notion URL embedding, owned-only highlight filtering, per-character accent colors, collector name attribution, divide-by-zero safety (0/0 case), well-formed SVG root, even distribution of highlight picks across owned cards, all-owned-returned when count exceeds available, unowned/image-less exclusion.

## Chained from PR #43

This PR is **stacked on `feat/pokemon-character-master-sets` (PR #43)** — it imports `PokemonMasterSetEntry` from the master-set library. Merge #43 first, then this lands cleanly on top.

## Future
- Multi-character grid (one SVG with 4 character bars stacked — overall Pokemon collection flex)
- QR code in a corner for the public Notion link
- One Piece equivalent (Luffy / Zoro flex graphic) once the OP master-set library lands
