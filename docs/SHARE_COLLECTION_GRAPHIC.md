# Share Collection Graphic

Generates a shareable image (1200×630 by default — Twitter / OG card sized) that summarizes a collector's Vault at a glance: their public Notion link, total card count, portfolio value, and 4–6 favorite cards as a visual tile strip.

Use case: a collector wants to post their Vault to a friend, an iMessage thread, a Discord channel, or a social profile and have a single image do all the talking. The Notion public link in the image is the call-to-action.

## What this PR adds

### `src/lib/share-collection-graphic.ts`
Pure SVG generator, **zero dependencies**:

- `buildShareCollectionSvg(input, options?)` → SVG string
- `formatTotalsLine(input)` → "247 cards · $12,450 portfolio · as of 2026-05-16"
- `svgDataUrl(svg)` → `data:image/svg+xml;charset=utf-8,...` for embedding inline

### Input shape

```ts
type ShareCollectionGraphicInput = {
  ownerName: string;
  collectionTitle?: string;          // defaults to "{ownerName}'s Vault"
  notionPublicUrl: string;
  totalCards?: number | null;
  totalMarketValue?: number | null;
  favoriteCards: ShareCollectionFavoriteCard[];
  tagline?: string | null;
  generatedAt?: Date;
};

type ShareCollectionFavoriteCard = {
  name: string;
  cardSetId: string;
  imageUrl: string;                  // optcgapi card image url
  rarity?: string | null;
  marketPrice?: number | null;       // renders under the card if present
};
```

### Output

A single self-contained SVG string. The favorite-card images are referenced by URL, so the image consumer (browser, Resvg renderer, Sharp pipeline, Notion preview) fetches them at render time.

### Options

```ts
type ShareCollectionGraphicOptions = {
  width?: number;          // default 1200
  height?: number;         // default 630
  background?: string;     // default #0c0e16 (deep navy)
  accent?: string;         // default #ffb547 (One Piece gold)
  textColor?: string;      // default #f4f4f5 (off white)
  maxFavoriteCards?: number; // default 4 — trims the input array
};
```

Pass custom colors per crew / per owner / per occasion (Halloween palette, set-launch palette, etc.).

## How to wire it as an agent tool

```ts
import { buildShareCollectionSvg, svgDataUrl } from "./lib/share-collection-graphic.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";
import { summarizeOwnedCards } from "./lib/collection.js";

worker.tool("shareCollectionGraphic", {
  title: "Share Collection Graphic",
  description: "Generate a shareable image of the collector's Vault.",
  schema: j.object({
    ownerName: j.string(),
    notionPublicUrl: j.string(),
    favoriteCardIds: j.array(j.string()).nullable(),
  }),
  execute: async ({ ownerName, notionPublicUrl, favoriteCardIds }, context) => {
    const owned = await fetchOwnedCards(context.notion);
    const summary = summarizeOwnedCards(ownerName, owned);
    // Pick favorites: either user-specified IDs or the top 4 by market value
    const favorites = pickFavorites(owned, favoriteCardIds);
    const svg = buildShareCollectionSvg({
      ownerName,
      notionPublicUrl,
      totalCards: summary.totalCards,
      totalMarketValue: summary.totalMarketValue,
      favoriteCards: favorites,
    });
    return { svg, dataUrl: svgDataUrl(svg) };
  },
});
```

The tool returns both the raw SVG (for callers that want to convert it server-side to PNG) and a `data:image/svg+xml,...` URL (drop directly into a Notion `image` block).

## Rendering to PNG

SVG is widely supported as-is — modern browsers, Twitter / X cards, Open Graph previews, Notion image blocks, Discord embed images all accept it. If a hard PNG is required (some chat clients prefer it), the SVG can be rasterized with:

- `@resvg/resvg-js` — fastest, Node-native, no headless browser
- `puppeteer` / `playwright` — heavier but pixel-perfect
- `sharp` (with `librsvg`) — production-grade

None of those are in this PR; the library returns an SVG and stops there. Add the rasterizer behind whatever consumer needs PNG.

## Tests
11 tests covering: public URL embedding, owner name + title rendering, favorite-card image + name rendering, market-price line ($X.XX), `maxFavoriteCards` truncation, HTML escaping in titles (XSS defense), graceful rendering without totals, custom color palette, `formatTotalsLine` combinations, `formatTotalsLine` graceful omissions, `svgDataUrl` encoding, well-formed SVG root.

All tests pass (`npm test`, `npm run typecheck` both green).

## Not in this PR
- The `worker.tool("shareCollectionGraphic", ...)` registration (kept as library + doc per the established pattern; wire-up is a one-tool follow-up)
- Notion-side favorite-card UX (an "Owner favorite" checkbox on the Owned Cards row would let the picker default to "the cards the user actually marked as favorite")
- QR code rendering for the public URL (a future enhancement)
