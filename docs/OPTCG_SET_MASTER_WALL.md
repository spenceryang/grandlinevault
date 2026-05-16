# One Piece Set Master Wall

A Notion gallery of **every card in an OPTCG set**, rendered with the same B&W-vs-color trick from the Pokémon Character Master Sets (PR #43): unowned cards display in greyscale, owned cards display in **full color** as the gallery cover.

Toggle the `Owned` checkbox in Notion and the card "lights up" — instant visual progress as you complete an OP set.

## How it works

Same pattern as the Pokémon character master sets:

- **`Owned Image`** — the original optcgapi card art URL (color)
- **`Need Image`** — the same URL routed through [wsrv.nl](https://wsrv.nl) with `&filt=greyscale` (free image proxy that applies grayscale on the fly)

Two gallery views in Notion:
- **"Owned Wall"** — Card preview: `Owned Image`, Card size: Large, Fit: **Page cover**, Filter: `Owned = true`. The color trophy shelf for the set.
- **"Need List"** — Card preview: `Need Image`, Card size: Large, Fit: **Page cover**, Filter: `Owned = false`. Same cards rendered in B&W until you tick them off.

No formula columns, no extra image pipeline, no re-syncs. The user toggles the checkbox and the card hops between views with the right color treatment for free.

## Library

`src/lib/optcg-set-master-wall.ts`:

- **`toGreyscaleImageUrl(url)`** — wraps any optcgapi image URL in the wsrv.nl greyscale proxy
- **`buildOptcgSetMasterWallEntries(setId, cards, ownedIds)`** — entries with both URLs:
  - Case-insensitive `ownedIds` matching
  - Matches by **either** `cardImageId` OR `cardSetId` so owning the base card marks all variants as owned (and vice versa)
  - Sorted by `cardSetId`, base printing before parallels within the same `cardSetId`
- **`summarizeOptcgSetMasterWall(entries)`** — totals + completion fraction

## Two Notion DBs

### `optcgSetMasterWall` — per-card-variant rows
Card Name (title), Card ID (pk = cardImageId so each variant is its own row), Base Card ID, Set ID/Name, Rarity, Color, Card Type, **Owned Image (file)**, **Need Image (file)**, **Owned (checkbox)**.

### `optcgSetMasterWallSummary` — per-set roll-up
Set Name (title), Set ID (pk), Total Cards, Owned, **Completion %** (percent — toggle "Show as bar"), Missing.

## Recommended Notion page layout

Per set (one page per OP-01 / OP-02 / …):
1. Linked summary DB filtered to that set — headline completion bar.
2. **Owned Wall** gallery view filtered to that set — color trophy shelf.
3. **Need List** gallery view filtered to that set — B&W chase list.

## Compared to the existing `masterSet` DB (PR #5)

The existing `masterSet` already tracks every printing per set with a `Variant` chip + `Owned` checkbox + single Image URL. This PR layers the **B&W/color visual treatment** on top by adding the dual-image-property pattern (`Owned Image` + `Need Image`).

Keep both DBs or migrate views — the data model overlaps but the new DB intentionally has two image properties so the dual-gallery view recipe works without Notion formulas.

## Tests
10 tests covering: greyscale URL wrapping, dual-URL row building with case-insensitive ownership, base-id-matches-parallel rule, exact-cardImageId matching, base-before-parallel sort, summary math, empty input safety, setName/setId fallback when card data is partial, and respect for card-provided setId/setName.

## Connection to share graphics
After the per-set master wall exists, the **character master set share graphic** library (PR #44) can be specialized per OP set ("Spencer's 42 of 154 in OP-01"). Small follow-up — same SVG generator, different inputs.

## Not in this PR
- `worker.sync` registrations — pure library + template per the established pattern. Doc has a copy-paste wiring snippet that iterates through `config.optcgSetIds`.
- `loadOwnedIdSet` helper — mirrors the existing `fetchOwnedCards` pattern; follow-up.
- A merged migration path from the existing `masterSet` DB — keep both for now, choose later.
