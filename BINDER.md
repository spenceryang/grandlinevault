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
