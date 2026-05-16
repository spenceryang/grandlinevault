# One Piece Set Master Wall

A tight **grid of every card in a One Piece set**, where unowned cards are **black-and-white** and owned cards are **full color**. Click any card to open its detail page and tick the `Owned` checkbox — the card flips from B&W to color the moment the checkbox flips.

The grid is the point. Cards sit edge-to-edge so the page reads like a digital binder, not a spreadsheet. As the collector fills in the set, the wall transitions from grayscale to vivid color one card at a time.

## The interaction

1. Open the OP set page in Notion (e.g. "OP-01 · Romance Dawn"). It renders a tight gallery — small spacing, every card in its place, mostly B&W early in your collection.
2. Spot a card you pulled in real life. Click the tile.
3. The card's **detail page** opens. It shows the full art, set, rarity, color, type, and an `Owned` checkbox.
4. Tick `Owned`. Close the page. The grid card you clicked now renders in **full color** — it lit up.
5. Repeat until the whole wall is in color.

That's the whole loop. No spreadsheets, no formulas, no separate "edit mode."

## How the B&W vs color works

Every row carries **two image properties**:

- **`Owned Image`** (file) — the original optcgapi card art URL (color)
- **`Need Image`** (file) — the same URL wrapped through [wsrv.nl](https://wsrv.nl) with `&filt=greyscale` — a free image proxy that applies grayscale server-side and serves the result

In Notion, configure **two stacked gallery views** on the page, both with **tight spacing for the grid aesthetic**:

| View | Filter | Card preview | Result |
|---|---|---|---|
| **Color Wall** | `Owned = true` | `Owned Image` (cover, Page cover fit) | Full-color trophy strip |
| **Greyscale Wall** | `Owned = false` | `Need Image` (cover, Page cover fit) | B&W "still to collect" strip |

When the collector toggles `Owned`, the row moves between views instantly. No formulas, no re-sync, no client-side rendering hack — Notion just shows whichever URL is in the property the active view points at.

### Notion view settings for the grid aesthetic

- **Card size**: Small (NOT Large — keeps the grid dense, ~6 cards per row on desktop)
- **Fit image**: **Page cover** (card art fills its tile edge-to-edge)
- **Show / hide properties**: hide everything except the cover. The grid is image-only.
- **Sort**: `Card ID` asc so the grid follows the set's natural numbering
- **Group**: none (don't break the grid into sections)

## Compact thumbnails — match image size to card size

The grid feels cleanest when all tiles share the same aspect ratio + dimensions. Optcgapi serves card art at varying high-resolution sizes, which (a) bloats Notion page load, (b) lets the image's intrinsic dimensions creep into the layout. Solution: ask `wsrv.nl` to **resize and crop** each image to a fixed target width.

Pass `thumbnailWidth` to `buildOptcgSetMasterWallEntries`:

```ts
import {
  buildOptcgSetMasterWallEntries,
  COMPACT_GRID_WIDTH,    // 280 — matches Notion gallery card Small
  STANDARD_GRID_WIDTH,   // 360 — matches Medium
  SHOWCASE_GRID_WIDTH,   // 480 — matches Large
} from "./lib/optcg-set-master-wall.js";

const entries = buildOptcgSetMasterWallEntries(setId, cards, owned, {
  thumbnailWidth: COMPACT_GRID_WIDTH,
});
```

What this does to the URLs:

| Before | After (with `thumbnailWidth: 280`) |
|---|---|
| `https://optcgapi.com/.../OP01-003.jpg` (1500×2100, ~400 KB) | `https://wsrv.nl/?url=...&output=jpg&w=280&fit=cover&q=85` (280×392, ~25 KB) |

The B&W variant gets the same treatment — same width, same crop, same compression, but with `&filt=greyscale` added.

### Why this matters for the aesthetic

- **Uniform dimensions** — every tile is exactly `thumbnailWidth × thumbnailWidth × 1.4`. No "this tile is slightly wider because the source was bigger."
- **Fast page loads** — a 200-card set served at compact width is ~5 MB total instead of ~80 MB. Notion's gallery view doesn't lazy-load aggressively, so the cold-load delta is noticeable.
- **Crisp on retina** — `q=85` keeps the image visually crisp while shrinking it ~10x.
- **`fit=cover`** — wsrv.nl centers + crops to fit the requested width, so portrait card art renders consistently without letterboxing.

### Presets

| Constant | px | Notion card size | Use when |
|---|---|---|---|
| `COMPACT_GRID_WIDTH` | 280 | Small | Dense gallery — the default aesthetic, ~6 cards/row desktop |
| `STANDARD_GRID_WIDTH` | 360 | Medium | Balanced — comfortable browsing |
| `SHOWCASE_GRID_WIDTH` | 480 | Large | Trophy / showcase pages where each card deserves attention |

`thumbnailWidth` is optional — leaving it unset returns the original optcgapi URL (the pre-styling behavior, preserved exactly).

## Click-to-mark-owned

The Notion built-in behavior carries the rest of the interaction for free:

- Each gallery tile is a **link to that card's page** by default. Click → page opens.
- On the page, the `Owned` checkbox is a single-tap toggle.
- Close the page → the gallery refreshes → if you ticked Owned, the tile moved from the Greyscale Wall to the Color Wall.

The card's page is where the rest of the detail lives (Rarity, Color, Card Type, Base Card ID, Set Name) — surfaced on the page header so the click reveals context, not just a checkbox.

## The schema

### `optcgSetMasterWall` — per-card-variant rows
- Card Name (title)
- **Card ID** (richText, primary key — `cardImageId` so each variant is its own tile)
- Base Card ID (richText) — groups variants
- Set ID, Set Name (richText)
- Rarity, Color, Card Type (richText)
- **`Owned Image`** (file, color) — used by Color Wall
- **`Need Image`** (file, B&W) — used by Greyscale Wall
- **`Owned`** (checkbox) — the only user-edited property; flips a tile between walls

### `optcgSetMasterWallSummary` — per-set roll-up
- Set Name (title), Set ID
- Total Cards, Owned, Missing (numbers)
- **`Completion %`** (percent — toggle "Show as bar" for a per-set progress visualization above the grid)

## Library

`src/lib/optcg-set-master-wall.ts`:
- `toGreyscaleImageUrl(url)` — wsrv.nl wrapper
- `buildOptcgSetMasterWallEntries(setId, cards, ownedIds)` — entries with both URLs, case-insensitive ownership, matches by either `cardImageId` or `cardSetId` (owning the base marks variants owned and vice versa), sorted by base card id with base printing before parallels
- `summarizeOptcgSetMasterWall(entries)` — totals + completion fraction

## Tests
10 tests covering: greyscale URL wrapping, dual-URL row building with case-insensitive ownership, base-id-matches-parallel rule, exact `cardImageId` match, base-before-parallel sort, per-set completion math, empty input safety, setName/setId fallback when card data is partial.

## Not in this PR
- `worker.sync` registrations — pure library + template. Worker wire-up is a small follow-up that iterates `config.optcgSetIds` and writes rows.
- A merged migration from the existing `masterSet` DB (PR #5) — both DBs coexist; this is the visual gallery surface.
- Per-set share graphic — reuse the existing share-graphic library (PR #44 pattern) once the wall is populated.
