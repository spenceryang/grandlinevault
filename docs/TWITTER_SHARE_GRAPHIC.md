# Twitter / X share graphic

Generates a **1200×675** SVG sized for Twitter / X in-feed image attachments. Optimized for collector posts: handle, headline, optional tweet caption, hashtags, a horizontal strip of up to 4 card tiles with price chips, and a footer with the public Notion URL.

## Visual

```
@spencer
Trade Night Drop
Selling 6 cards

Just pulled the Charizard 4/102 of my dreams in PSA 9
graded condition! Trading or selling — DM me.

#PokemonTCG  #Vault  #Charizard

[card $250]  [card $80]  [card $40]  [card]

notion.so/Vault-abc       Grand Line Vault · 2026-05-16
```

## What this PR adds

### `src/lib/twitter-share-graphic.ts`
- `buildTwitterShareGraphicSvg(input, options?)` → SVG string (1200×675 default)
- `formatHandle(value)` — prefixes `@` if missing, trims whitespace
- `wrapText(text, max)` — word-boundary wrapping for tweet text

### Input shape

```ts
type TwitterShareGraphicInput = {
  headline: string;
  subhead?: string | null;
  handle?: string | null;         // "spencer" or "@spencer" — both work
  tweetText?: string | null;      // wrapped to ~110 chars, max 3 lines
  hashtags?: string[];            // ["PokemonTCG", "#Vault"] — auto-prefixed
  listings: TwitterCardListing[];
  notionPublicUrl?: string | null;
  generatedAt?: Date;
};

type TwitterCardListing = {
  name: string;
  cardId: string;
  imageUrl: string;
  marketPrice?: number | null;    // renders as $X price chip on top-right of tile
};
```

### Options

```ts
type TwitterShareGraphicOptions = {
  width?: number;        // default 1200
  height?: number;       // default 675 (16:9)
  background?: string;   // default deep navy
  accent?: string;       // default Twitter blue #1da1f2
  textColor?: string;
  maxListings?: number;  // default 4
};
```

Switch `width`/`height` for a 4:1 banner (`1500×500`) or a profile card.

## Wiring sketch (in the doc)

```ts
worker.tool("makeTwitterShare", {
  schema: j.object({
    headline: j.string(),
    handle: j.string().nullable(),
    tweetText: j.string().nullable(),
    hashtags: j.array(j.string()).nullable(),
    featureCardIds: j.array(j.string()).nullable(),
  }),
  execute: async (input, context) => {
    const listings = input.featureCardIds
      ? await loadListingsForCardIds(context.notion, input.featureCardIds)
      : await loadRecentPulls(context.notion, 4);
    const svg = buildTwitterShareGraphicSvg({
      ...input,
      hashtags: input.hashtags ?? [],
      listings,
    });
    return { svg };
  },
});
```

Agent prompts:
- *"Make a Twitter graphic for my Charizard PSA 9 pull, handle @spencer, hashtag PokemonTCG"*
- *"Twitter share of my top 4 most-valuable Pokémon cards"*
- *"Twitter card announcing OP15-EB04 arrived in my vault — handle @spencer, tag #OnePieceTCG #OP15"*

## XSS safety
All user-controlled text (headline, subhead, handle, tweet text, hashtags, listing names) is HTML-escaped before SVG injection. Test asserts `<script>alert(1)</script>` renders as escaped text.

## Tests
15 tests covering: 1200×675 default dimensions, handle prefix logic (with + without @), headline + subhead, tweet text wrapping, hashtags with auto-prefix, price chip + null-price omission, `maxListings` truncation, XSS escaping, footer (URL + date), `formatHandle` happy + edge cases, `wrapText` boundary-correct wrapping + single-overlong-word + empty input.

All tests pass (`npm test`, `npm run typecheck` both green).

## Connection to other share graphics
- **PR #41** — `buildShareCollectionSvg` (1200×630, Vault-level OG card)
- **PR #44** — `buildCharacterMasterSetSvg` (1200×630, character flex)
- **PR #47** — `buildIgShareStorySvg` (1080×1920, IG Stories)
- **This PR** — `buildTwitterShareGraphicSvg` (1200×675, Twitter / X feed)

Each is a separate library so consumers can compose any combination. Future PR can consolidate shared SVG helpers (escape, gradient, etc.) into a common module.

## Rasterization
Twitter / X **does** accept SVG for some integrations but not the main feed image attachment. For posting to the feed, rasterize to PNG with `@resvg/resvg-js`. Not in this PR.

## Not in this PR
- Worker tool registration — pure library + doc.
- Server-side PNG rasterization — same trade-off as the IG story; consumers add `@resvg/resvg-js` when wiring.
- Multi-card hero variants (e.g. one big card on the left + small grid right) — future enhancement.
EOF
