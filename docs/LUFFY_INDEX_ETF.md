# Luffy Index ETF

A Notion-native, price-weighted index of every Monkey D. Luffy card printed in the One Piece TCG.

If the S&P 500 tracks the 500 largest US companies, the **Luffy Index** tracks the ~100 printings of Luffy in OPTCG — Leaders, Characters, base prints, parallels, alt-arts, secret rares, and promos — weighted by current market price.

## Why this exists

Collectors who care about Luffy specifically (Strawhat completionists, character collectors, traders) want a single board that answers:

- How much is "owning every Luffy" worth right now?
- What's the most valuable Luffy printing this week?
- How concentrated is the index — does one card dominate the weight?
- Which sets are the most Luffy-rich?
- Am I underexposed to the top holdings?

Notion gives us free progress bars, gallery views, sortable tables, and a Custom Agent that can answer those questions in plain English. The index lives in Notion, so it's instantly multi-user and dashboard-friendly.

## What gets included

Any card whose `card_name` matches:

```
/Monkey\.?D\.?Luffy|^Luffy\b/i
```

That covers `Monkey.D.Luffy`, `Monkey D Luffy`, and the rare `Luffy ...` printings (e.g. nicknamed variants). Cards with **zero market price** are excluded so a stale entry doesn't dilute the weights.

## Methodology

**Price-weighted, like the Dow Jones.** Each printing's weight is:

```
weight = market_price / total_index_market_value
```

Notion stores `Index Weight` as a `percent` property. Toggle "Show as bar" on that column → instant per-card weight bars. The top-weighted card visually dominates, as it should.

**Why not market-cap weighted?** TCG cards don't have a real "supply" we can pin down (print runs are unpublished). Price-weighting lets a single mythic-rare Luffy meaningfully move the index — which is closer to how collectors think.

## Notion board layout

The `luffyIndex` managed database (defined in `src/notion/luffy-index-database.ts`) has one row per Luffy printing:

| Column | Type | Notes |
|---|---|---|
| Name | title | "Monkey.D.Luffy (003) (Parallel)" |
| Variant ID | richText (pk) | `OP01-003_p1` — unique per printing |
| Base Card ID | richText | `OP01-003` — groups variants |
| Set ID | richText | `OP-01` |
| Set Name | richText | "Romance Dawn" |
| Variant | select | `base` / `parallel` / `alt-art` / `promo` |
| Rarity | richText | `L`, `SR`, `SEC`, etc. |
| Card Type | richText | `Leader`, `Character` |
| Market Price | number (dollar) | live from optcgapi.com |
| **Index Weight** | **number (percent)** | toggle "Show as bar" for the cool visualization |
| Image | url | optcgapi image asset |
| Owned | checkbox | per-user ownership |

**Recommended views**
- **Gallery by Index Weight (desc)** — the cover view, sorted big to small
- **Table by Set** — see how many Luffys are in each set
- **Board by Variant** — base / parallel / alt-art columns
- **Filter "Owned = true"** — your current Luffy holdings
- **Filter "Owned = false" sorted by Market Price asc** — cheapest Luffys you don't have, your buy list

## Sample top holdings (as of 2026-05-16)

| Rank | Card | Set | Rarity | Price |
|---|---|---|---|---|
| 1 | Monkey.D.Luffy (118) (Red Super Alternate Art) | OP-13 | SP | $8,489.98 |
| 2 | Monkey.D.Luffy (119) (SP) (Gold) | OP-05 | SP | $4,048.51 |
| 3 | Monkey.D.Luffy (OP05-119) (Manga) | OP-05 | SP | $3,975.00 |
| 4 | Monkey.D.Luffy (119) (Alternate Art) (Manga) | OP-05 | SR | $3,915.86 |
| 5 | Monkey.D.Luffy (012) (Alternate Art) (Gold-Stamped Signature) | ST-01 | SR | $3,282.21 |

The top card alone routinely accounts for **20%+ of the total index value**. That's the kind of concentration risk collectors should be aware of.

## How to populate the board

This PR adds the library and Notion DB config — not the sync. To wire it up:

```ts
import { worker } from "./worker.js";
import {
  LUFFY_INDEX_DATABASE_KEY,
  luffyIndexDatabaseConfig,
} from "./notion/luffy-index-database.js";
import { listAllOptcgSetCards } from "./providers/optcgapi/list-all-set-cards.js";
import { buildLuffyIndex } from "./lib/luffy-index.js";
import * as Builder from "@notionhq/workers/builder";

const luffyIndex = worker.database(
  LUFFY_INDEX_DATABASE_KEY,
  luffyIndexDatabaseConfig,
);

worker.sync("syncLuffyIndex", {
  database: luffyIndex,
  mode: "replace",
  schedule: "1d",
  execute: async () => {
    const cards = await listAllOptcgSetCards();
    const entries = buildLuffyIndex(
      cards.map((c) => ({
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
      })),
    );
    return {
      changes: entries.map((e) => ({
        type: "upsert" as const,
        key: e.variantId,
        properties: {
          Name: Builder.title(e.name),
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
      })),
      hasMore: false,
    };
  },
});
```

## Agent prompts that work well on this board

- "How much would owning every Luffy card cost today?"
- "What are my biggest Luffy holdings by index weight?"
- "Which Luffy cards have I never seen, ranked by price ascending?"
- "How exposed is the Luffy index to OP-05 vs OP-01?"

## Future variants of the same idea

Once the `buildLuffyIndex` shape is in place, swapping out the `LUFFY_NAME_PATTERN` regex yields:

- **Zoro Index** — `/Roronoa\.?Zoro/i`
- **Strawhat Index** — union of all crew members
- **Yonko Index** — Kaido, Big Mom, Shanks, Blackbeard, Whitebeard, Luffy
- **Devil Fruit Index** — any card whose subtype indicates a fruit user

Same Notion shape, same logic, different filter. That's the seed of a small library of character-themed indices.
