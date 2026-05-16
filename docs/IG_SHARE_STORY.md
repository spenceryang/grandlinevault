# IG Share Story (9:16)

Generates a **1080×1920** SVG sized for Instagram / TikTok / Snapchat Stories, optimized for sellers who want to flex what they're selling. Pulls a list of card listings (from the duplicate cards "Sell pile" or any hand-curated set), renders each as a tile with image + price + condition, and prints a CTA + public Notion URL.

## Use case

The collector marks N duplicates as `Status = Sell` in the Duplicate Cards dashboard (PR #46). They open Slack, ask the agent "Make me an IG story of what I'm selling," and get back a sharable 9:16 image:

```
        FOR SALE
   Trade Night Drop
   8 cards available

   [card]  [card]
   [card]  [card]
   [card]  [card]
   [card]  [card]

   Seller: Spencer
   DM to buy
   Bundle discounts available

   notion.so/SpencerVault
```

Drop it into the IG story composer (or rasterize to PNG first for clients that don't accept SVG).

## What this PR adds

### `src/lib/ig-share-story-svg.ts`

- `buildIgShareStorySvg(input, options?)` → SVG string

### Input shape

```ts
type IgShareStoryInput = {
  headline: string;                     // "Trade Night Drop", "Selling These", etc.
  sellerName?: string | null;           // optional "Seller: <name>" line above CTA
  subhead?: string | null;              // overrides default "{N} cards available"
  ctaPrimary?: string | null;           // default "DM to buy"
  ctaSecondary?: string | null;         // optional second-line CTA
  listings: IgStoryCardListing[];
  notionPublicUrl?: string | null;      // call-to-action URL above footer
  generatedAt?: Date;
};

type IgStoryCardListing = {
  name: string;
  cardId: string;
  imageUrl: string;
  askingPrice?: number | null;          // null renders as "DM for price"
  condition?: string | null;            // "PSA 8", "Near Mint", etc.
};
```

### Options

```ts
type IgShareStoryOptions = {
  width?: number;          // default 1080
  height?: number;         // default 1920 (9:16)
  background?: string;     // default deep navy
  accent?: string;         // default One Piece gold
  textColor?: string;      // default off-white
  maxListings?: number;    // default 6 — trims the input list
};
```

Override `width` / `height` if you want a 4:5 feed-post variant (`1080 × 1350`) or a square (`1080 × 1080`).

### Layout

- Single column for 1-2 listings, 2 columns for 3+
- Each tile: card image (top), card name (bottom, truncated to 24 chars), price + condition line in the accent color
- Border, gradient background, large headline, optional seller line, primary + secondary CTA, footer with public Notion URL + generation date

## How to wire it as an agent tool

```ts
import { buildIgShareStorySvg } from "./lib/ig-share-story-svg.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";

worker.tool("makeIgShareStory", {
  title: "Make IG Share Story",
  description: "Generate a 1080x1920 Instagram-story image of cards I'm selling.",
  schema: j.object({
    headline: j.string(),
    sellerName: j.string().nullable(),
    ctaPrimary: j.string().nullable(),
    ctaSecondary: j.string().nullable(),
    notionPublicUrl: j.string().nullable(),
    // Either a list of cardIds to feature, or pull from duplicate `Status = Sell`
    featureCardIds: j.array(j.string()).nullable(),
  }),
  execute: async ({ headline, sellerName, ctaPrimary, ctaSecondary, notionPublicUrl, featureCardIds }, context) => {
    const listings = featureCardIds
      ? await loadListingsForCardIds(context.notion, featureCardIds)
      : await loadListingsFromSellPile(context.notion); // duplicate cards with Status = Sell
    const svg = buildIgShareStorySvg({
      headline,
      sellerName,
      ctaPrimary,
      ctaSecondary,
      notionPublicUrl,
      listings,
    });
    return { svg };
  },
});
```

## Where the listings come from

This PR is intentionally **input-agnostic** — `buildIgShareStorySvg` just takes a list and renders it. Wiring code chooses the source:

- **Duplicate cards marked `Status = Sell`** (PR #46) — the natural source for "I'm selling these"
- **Any user-curated list** — agent prompt: "Build me a story with my top 6 most-valuable Pikachus"
- **Wishlist items in `Status = Acquired`** that the user wants to flex as a "just got these" post

## Rasterization for IG

Instagram Stories does NOT accept SVG directly — you need PNG/JPEG. Use a rasterizer:

- `@resvg/resvg-js` — Node-native, fastest
- `sharp` with `librsvg`
- Puppeteer / Playwright — heavier but pixel-perfect

Not in this PR. Add the rasterizer behind whatever consumer needs PNG.

## XSS safety

All user-controlled text (headline, seller name, listing names, CTAs, condition strings) is HTML-escaped before SVG injection. A name like `<script>alert(1)</script>` renders as escaped text, not as a script tag. Test covers this explicitly.

## Tests
11 tests covering: default 1080×1920 dimensions, headline + listing-count subhead, asking price + DM fallback, seller name attribution, `maxListings` truncation, long-name truncation with ellipsis, XSS escaping, public URL rendering, default CTA, custom primary + secondary CTA, custom dimensions + colors.

All tests pass (`npm test`, `npm run typecheck` both green).

## Not in this PR
- Worker tool registration — pure library + doc per the established pattern.
- Server-side PNG rasterization — SVG is the format the library produces; consumers decide if they need PNG.
- Multi-template support (4:5 feed post, 1:1 square) — overrideable via `width`/`height` options, but no preset constants exported yet.
- QR code rendering of the public URL — future enhancement.
EOF
