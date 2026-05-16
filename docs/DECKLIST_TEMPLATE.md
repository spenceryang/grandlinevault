# Decklist Template

A Notion-native deck builder for One Piece TCG: two related databases (`Decks` and `Decklist Entries`) + a pure-logic library that validates a deck against the official OPTCG construction rules and renders cost-curve / color-breakdown summaries.

## Why this exists

Brewing a One Piece deck in a spreadsheet is rough — no images, no live prices, no rule validation, and trades between players still happen on screenshots. With this template:

- Each deck is a Notion page with structured fields (Leader, Owner, Format, Status, Card Count, Estimated Value)
- Each card slot is a row in a related database, with the card's image, color, cost, power, rarity, and market price
- The same data can be browsed as a **card list** (table) or as an **image gallery** — the user picks the view, the data is the same
- The companion `validateOptcgDecklist()` helper flags illegal decks (wrong leader count, off-color cards, more than 4 copies, wrong main-deck size)

## The two databases

### `Decks` (`src/notion/decks-database.ts`)

One row per deck. Headline fields:

| Property | Type | Notes |
|---|---|---|
| Deck Name | title | "Red Aggro Luffy", "Kid Stall" |
| Deck ID | richText (pk) | URL-safe slug or UUID |
| Owner | richText | who's brewing it |
| Leader Name | richText | denormalized for quick scanning |
| Leader Card ID | richText | e.g. `OP01-001` |
| Leader Image | url | gallery-ready |
| Colors | richText | e.g. "Red", "Red Green" |
| Format | select | Standard / Online / Casual / Limited |
| Status | select | Building / Active / Retired |
| Card Count | number | total in main deck |
| Estimated Value | number ($) | sum of all card market prices × quantities |
| Created / Updated | date | lifecycle |
| Notes | richText | sideboard ideas, matchup notes |

### `Decklist Entries` (`src/notion/decklist-entries-database.ts`)

One row per `(deck, card)` pair. The `Deck` column is a two-way relation to the `Decks` database (back-relation auto-creates a `Cards` property on each deck page).

| Property | Type | Notes |
|---|---|---|
| Card Name | title | denormalized so list view shows it |
| Entry ID | richText (pk) | `{deckId}:{cardImageId}` works well |
| Deck | relation | two-way to `Decks` |
| Card ID | richText | `OP01-001`, `OP01-001_p1` |
| Card Image | url | so gallery view renders |
| Slot | select | Leader / Character / Event / Stage / DON |
| Set | richText | source set |
| Color | richText | "Red", "Red Green" |
| Rarity | richText | C / UC / R / SR / L / SEC |
| Cost | number | mana cost (Leader has no cost) |
| Power | number | character power |
| Quantity | number | 1–4 (Leader = 1) |
| Market Price | number ($) | live from optcgapi pricing |

## Recommended views (set up once in Notion)

The schema is intentionally view-agnostic. After Notion provisions the databases, the workspace owner sets up these views:

### `Decklist Entries` → **"Card List"** (default)
- Type: **Table**
- Group: `Slot` (puts Leader at top, then Character, Event, Stage, DON)
- Visible columns: `Card Name`, `Card ID`, `Color`, `Cost`, `Power`, `Quantity`, `Market Price`, `Set`
- Sort: `Cost` asc within group
- Filter: `Deck = <current deck>` (set per-deck when embedded on the deck page)

This is the spreadsheet-style view — easy to scan a full 50-card list and verify counts.

### `Decklist Entries` → **"Card Wall"** (image gallery)
- Type: **Gallery**
- Card preview: `Card Image`
- Card size: Medium
- Visible properties (under each tile): `Card Name`, `Quantity`, `Cost`
- Group: `Slot`
- Sort: `Cost` asc

The visual deck-builder view — you see each printing as the actual card art. Trade-friendly screenshots, eyeball-friendly missing-card hunts.

### `Decklist Entries` → **"By Color"** (board)
- Type: **Board**
- Group by: `Color`
- Card preview: `Card Image`
- Visible: `Card Name`, `Cost`, `Quantity`

Useful for checking color distribution at a glance and spotting off-color cards the validator warned about.

### `Decklist Entries` → **"Cost Curve"** (board)
- Type: **Board**
- Group by: `Cost` (1, 2, 3, 4, 5, 6, 7+)
- Card preview: `Card Image`
- Visible: `Card Name`, `Power`, `Quantity`

The cost-curve view — collectors and competitive players use this to balance mana curves.

### `Decks` → **"My Decks"**
- Type: **Gallery**
- Card preview: `Leader Image`
- Filter: `Owner = <me>`, `Status != Retired`
- Visible: `Deck Name`, `Colors`, `Format`, `Card Count`

A wall of your active decks, each represented by the Leader's card art.

### `Decks` → **"Building"**
- Type: **Table**
- Filter: `Status = Building`
- Visible: `Deck Name`, `Owner`, `Card Count`, `Estimated Value`, `Updated`
- Sort: `Updated` desc

What's currently being brewed across the workspace.

## Suggested layout: the `Deck Builder` Notion page

Create one page per deck. Block layout:

```
# Red Aggro Luffy

[Linked database: Decks · filter Deck ID = red-aggro-luffy · single-page view]

## Card List
[Linked database: Decklist Entries · "Card List" view · filter Deck = red-aggro-luffy]

## Image Wall
[Linked database: Decklist Entries · "Card Wall" view · filter Deck = red-aggro-luffy]

## Cost Curve
[Linked database: Decklist Entries · "Cost Curve" view · filter Deck = red-aggro-luffy]

## Notes
- Mulligan plan against blue stall: keep low-cost board presence
- Sideboard: TBD
```

Both views (card list + image wall) point at the same underlying rows — change a quantity in either view, the other updates automatically. That's the Notion-native answer to "view by cards" vs "view by images".

## Validation

`src/lib/decklist.ts` exports:

```ts
validateOptcgDecklist(entries: DecklistEntry[]) → {
  valid: boolean,
  errors: string[],
  warnings: string[],
  stats: {
    leaderCount, mainDeckCount, donCount, totalCards, uniqueCards,
    estimatedValue, colorBreakdown, costCurve,
  }
}
```

Rules encoded:

- **1 Leader** (error if not exactly one)
- **50-card main deck** (Characters + Events + Stages, error if not exactly 50)
- **Max 4 copies** of any non-Leader, non-DON card (error)
- **10 DON!!** cards (warning if non-zero but ≠ 10 — DON can be tracked separately)
- **Color identity** — any main-deck card with a color outside the Leader's color identity emits a warning (not an error — house rules, draft, and the upcoming Limited format may differ)

Plus:

- `summarizeDecklist(entries)` — the same `stats` payload, callable without validation (useful for in-progress decks)

A natural place to wire `validateOptcgDecklist` is an agent tool:

```ts
worker.tool("validateDeck", {
  title: "Validate Deck",
  description: "Check a One Piece TCG decklist against the official construction rules.",
  schema: j.object({ deckId: j.string() }),
  hints: { readOnlyHint: true },
  execute: async ({ deckId }, context) => {
    const entries = await loadDecklistEntries(context.notion, deckId);
    return validateOptcgDecklist(entries);
  },
});
```

That tool isn't in this PR (it requires the workspace-specific reader to be wired up against the `decklistEntries` data source) — but the validation engine and stats summary are.

## Future enhancements

- Sideboard support (add `Sideboard` boolean to entries)
- Format-specific validation (Limited has a different deck size; this code currently encodes Standard rules)
- Deck-versus-deck comparison (overlap analysis: "how many cards do these two Red decks share?")
- Import from text dump (parse a `4x Monkey D Luffy (OP01-003)` plaintext block into entries)
- Export to OPTCG-Sim friendly format

The schemas in this PR cover everything needed for those features without further migration.
