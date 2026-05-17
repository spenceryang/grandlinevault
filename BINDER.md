# Binder setup guide

One-time clickthrough to make the Notion side of Grand Line Vault look like an actual binder. The schema is shipped by the worker; views and card-rendering preferences are per-workspace and have to be set in Notion's UI.

## Master Set — the binder itself

### Card density (via env var)

The `Image` property on every Master Set row is routed through the wsrv.nl image proxy. Resolution is controlled by `BINDER_DENSITY`:

```shell
ntn workers env push BINDER_DENSITY=small    # 280px — tighter grid, more cards per row
ntn workers env push BINDER_DENSITY=medium   # 360px (default)
ntn workers env push BINDER_DENSITY=large    # 480px — fewer cards, larger art
ntn workers sync trigger syncOptcgMasterSet
```

Pair with Notion's gallery card size dropdown:

| `BINDER_DENSITY` | Notion gallery card size | Feel |
|---|---|---|
| `small` | Small | Binder page |
| `medium` | Medium | Comfortable browsing |
| `large` | Large | Showcase |

### Recommended views

Duplicate the auto-created Master Set view three times and configure each:

**"Binder" (default)**
- View type: Gallery
- Card preview: `Image` (Page cover off — use the file property)
- Fit page cover: on
- Card size: Medium (or match your `BINDER_DENSITY`)
- Hide every property on the card except the title (cleaner grid)
- Sort: `Set ID` ascending, then `Variant ID` ascending
- No filter — unowned cards render grayscale via wsrv when that mode is enabled on the source sync; here they render full color

**"Owned Only"**
- Duplicate "Binder"
- Add filter: `Owned` is checked
- Use this view for screenshots / Instagram exports

**"Missing"**
- Duplicate "Binder"
- Add filter: `Owned` is not checked
- Use this view to drive the wishlist

**"Image Only" — pure grid, no text**
- Duplicate "Binder"
- View settings → Properties → **hide the title too** (the existing "Binder" view keeps the title visible; this one drops it)
- Card preview: `Image`, Fit page cover: on
- Card size: Small (or match `BINDER_DENSITY=small`) for the densest grid
- No filter
- Use this view for screenshots / IG-story exports and the "I just want to look at the binder" mode

### B&W → color binder ("cards light up as you collect them")

The Master Set sync writes **two image properties** per card:

- **`Image`** (file) — full color art, used by the "Owned Wall"
- **`Need Image`** (file) — the same art wrapped through wsrv.nl with `&filt=greyscale`, used by the "Missing Wall"

Both URLs go through the wsrv.nl proxy at a uniform width so tiles share dimensions across the grid. Stack two filtered views on the page and Notion does the rest — toggle the `Owned` checkbox on any card and it moves from the grayscale wall to the color wall instantly. No formulas, no re-sync.

| View | Filter | Card preview | Result |
|---|---|---|---|
| **Owned Wall** | `Owned` is checked | `Image` | Full-color trophy strip |
| **Missing Wall** | `Owned` is not checked | `Need Image` | B&W "still to collect" strip |

Pair both with the standard image-only settings (Card size Small, Fit page cover on, hide every property including title) and you get the canonical card-shop binder feel — every card slotted into its space, grayscale until you pull it.

This mirrors the treatment on the [optcg-set-master-wall](./docs/OPTCG_SET_MASTER_WALL.md) template, which has the same pattern at the set level.

### Cards-per-row math

Notion auto-flows gallery cards based on page width × card size. Quick reference for a Full-Width page on a typical 1440px desktop:

| Card size | `BINDER_DENSITY` to match | Cards per row |
|---|---|---|
| Small | `small` (280px) | 6–7 |
| Medium | `medium` (360px) | 4–5 |
| Large | `large` (480px) | 2–3 |

If you're seeing only 1–2 cards per row no matter what:

| Cause | Fix |
|---|---|
| Page is not Full Width | Page `···` menu → Customize page → toggle Full Width on |
| Card preview is showing Page content instead of the `Image` file property | View settings → Card preview → `Image` |
| Fit page cover is off | View settings → Fit page cover → on |
| `Image` property is `url`-typed, not `file`-typed | PR #53 + #64 switched these to `Schema.file()` — confirm those merged |

### Page-cover trick

If the gallery doesn't render the card art:

1. Confirm `Image` is a **File** property (not URL) — the schema is `Schema.file()` after PR #53 merges
2. View settings → Card preview → `Image`
3. Toggle "Fit page cover" so the art fills the card without crop bars

## Other databases — quick view recs

| Database | Recommended view | Sort | Card/row |
|---|---|---|---|
| Wishlist Insights | Board, group by `Status` | `Percent Below Target` desc | n/a |
| Trade Matches | Board, group by `Status` | `Priority` desc | n/a |
| Duplicate Cards | Board, group by `Status` | `Tradeable Value` desc | n/a |
| Price Movers | Table, sort `Percent Change` desc | — | — |
| Set Analytics | Table, sort `Completion %` desc | — | — |
| Decks | Gallery, card preview `Leader Image`, group by `Status` | `Updated` desc | Medium |
| Decklist Entries | Gallery, card preview `Card Image`, group by `Slot` | `Cost` asc | Small |
| Character Index / Luffy Index | Gallery, card preview `Image`, group by `Character` (Character Index only) | `Index Weight` desc | Small |

## Notes

- Notion's public API does **not** expose database views as writable resources, so this guide can't be replaced by a script. Set up once per workspace.
- Properties hidden in a view are still queryable via the API — hiding is a presentation choice only.
- If a sync recreates a database (rare — only after `ntn workers sync state reset`), views are preserved as long as the database row itself isn't deleted.
