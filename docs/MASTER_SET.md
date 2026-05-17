# Master Set — image collection wall

The Master Set database is meant to render like a **vintage binder page**: every card in the set sits in a tight grid, edge-to-edge, no padding between tiles. Owned cards show in **full color**, unowned in **grayscale** — the collector watches the binder fill in one card at a time as they tick `Owned`.

```
┌─────────┬─────────┬─────────┐
│ Pikachu │Charizrd │ Blstoise│
│  (color)│ (color) │ (color) │
├─────────┼─────────┼─────────┤
│ Mewtwo  │ Gengar  │Alakazam │
│  (color)│  (B&W)  │  (B&W)  │
└─────────┴─────────┴─────────┘
```

That's the target. Three rules deliver it:

1. **Card preview = the Image property**, and the Image property is a `file`-typed property — Notion lets gallery views use file properties as full-cover previews.
2. **Card size = Small**, **Fit = Page cover** — both set in the gallery view's Layout panel. Small + Page cover is what produces the tight binder look. Medium and Large add padding.
3. **Hide every other property** under the tile so each tile is just the card art. The grid is image-only.

## Schema (this PR)

The schema reorder puts the eye-catching columns first so the table view reads top-down naturally:

| Order | Property | Type | Why first / why last |
|---|---|---|---|
| 1 | Name | title | Notion always puts the title column first; this is the card's display name |
| 2 | Variant ID | richText (pk) | The unique key per printing; needed for identity scanning |
| 3 | **Owned** | checkbox | The primary action — collectors hit this column most |
| 4 | **Variant** | select (base/parallel/alt-art/promo, colored) | Eye-catching chip; tells you which printing at a glance |
| 5 | **Image** | **file** | The visual — switched from `url` to `file` so it can serve as the gallery card cover |
| 6 | Set Name | richText | Human-readable set label |
| 7 | Rarity | richText | |
| 8 | Color | richText | |
| 9 | Card Type | richText | |
| 10 | Base Card ID | richText | Groups variants; less important day-to-day |
| 11 | Set ID | richText | Machine code; lowest priority in table view |

The `Variant` select chips remain colored (default / blue / purple / orange) so a glance at the table immediately distinguishes base printings from parallels and alt-arts.

## Two views to set up in Notion (one-time, per set page)

### "Color Wall" — owned cards in full color

- **Type:** Gallery
- **Card preview:** `Image`
- **Card size:** **Small**
- **Fit image:** **Page cover** ← critical for the edge-to-edge look
- **Properties shown under each tile:** none. Hide everything.
- **Filter:** `Owned` is checked
- **Sort:** `Variant ID` ascending (so the binder follows the set's natural numbering)
- **Group:** none (a single tight grid, not a banded list)

### "Greyscale Wall" — unowned cards rendered in B&W

- **Type:** Gallery
- **Card preview:** `Image`
- **Card size:** Small
- **Fit image:** Page cover
- **Properties shown under each tile:** none
- **Filter:** `Owned` is NOT checked
- **Sort:** `Variant ID` ascending
- **Group:** none

For the grayscale effect on unowned tiles, write the image URL through a free image proxy that applies a `grayscale` filter on the fly. Recommended: [wsrv.nl](https://wsrv.nl) with `&filt=greyscale`. Pair the schema in this PR with the dual-image-property pattern from PR #50 (`Owned Image` + `Need Image`) for the truest version of the binder visual — the `masterSet` row stores a single `Image`, and the per-set "wall" surface uses the dual-image variant.

## Tile-level interaction

Click any tile → the card's page opens → all the metadata is there (Set Name, Rarity, Color, Card Type, Base Card ID, Set ID), and the **`Owned` checkbox** lives at the top of the right panel for fast toggling. Tick it, close the page, the tile moves from the Greyscale Wall to the Color Wall instantly.

That's the entire flow. No formulas, no re-syncs, no client-side rendering — just two filtered views over the same data.

## What this PR changes

- **Property order** reshuffled to put `Owned`, `Variant`, `Image` immediately after the title + pk
- **`Image` is now `Schema.file()`** (was `Schema.url()`) so Notion treats it as a real cover. Sync side switched to `Builder.file(url, name)` to match.
- Comments in `master-set-database.ts` explain the order so future hands don't accidentally reshuffle it

## Companions

- **PR #50** — OP set master wall with the explicit dual-image (B&W + color) treatment
- **PR #51** — compact thumbnail presets (`COMPACT_GRID_WIDTH = 280`, etc.) that produce the uniform-dimensions binder grid
- **PR #43** — same B&W/color pattern for Pokémon character master sets

This PR is the canonical `masterSet` database's slot in that family — the schema is now ready to drive a clean Image Collection Wall view.
