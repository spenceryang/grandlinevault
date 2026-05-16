# Image Gallery Views

Every card-bearing database in Grand Line Vault stores an image URL, a Notion file pointer, or a page cover. To browse by image instead of by name, use Notion's **Gallery view** and make the card art the preview.

The highest-impact surface is **My Collection Wall**: a large-card gallery of Owned Cards that looks like a digital binder.

## Which databases support gallery view today

| Database | Image property | Configured by | Gallery-ready? |
|---|---|---|---|
| Card Catalog (`cardCatalog`) | `Image` (file) | `src/index.ts` | ✅ |
| Master Set (`masterSet`) | `Image` (url) | `src/notion/master-set-database.ts` | ✅ |
| Luffy Index ETF (`luffyIndex`) | `Image` (url) | `src/notion/luffy-index-database.ts` | ✅ |
| Owned Cards (user-managed) | Page cover + `Scan image` file field | `src/notion/write-owned-card.ts` + `docs/NOTION_WORKSPACE_SETUP.md` | ✅ |
| Set Completion Dashboard (`setAnalytics`) | — | `src/notion/analytics-databases.ts` | ❌ summary board, no per-row image |
| Price Snapshots (`priceSnapshots`) | — | `src/index.ts` | ❌ time-series, no per-row image |

`url`-typed images (master set, Luffy index) and `file`-typed images (card catalog / owned scans) both render in Notion gallery tiles. Newly created Owned Card pages also set the card image as the **page cover**, which makes the cleanest Notion gallery preview.

## Ship this first: My Collection Wall

Create a linked view of **Owned Cards** on the Grand Line Vault home page:

1. Type `/linked` and choose **Create linked view of database**.
2. Select **Owned Cards**.
3. Add a **Gallery** view named `My Collection Wall`.
4. Open `··· → Layout`:
   - **Card preview**: `Page cover`
   - **Card size**: `Large`
   - **Fit image**: on, if available in the workspace
5. Open `··· → Properties` and show only:
   - `Card ID`
   - `Owner`
   - `Quantity`
   - `Market Price`
6. Sort:
   - `Market Price` descending for a trophy-wall feel, or
   - `Created time` descending for “recently scanned.”
7. Add quick filtered duplicates of the same view:
   - `Spencer's Wall`: `Owner contains Spencer`
   - `Crew Wall`: no owner filter
   - `High Value`: `Market Price is greater than 25`
   - `Duplicates`: `Quantity is greater than 1`

This is the view to show after the Slack demo answers “what card did I just scan?”

## Recipe: add a gallery view to any of the above

In Notion, open the database page (`Grand Line Vault · Card Catalog`, `Master Set`, `Luffy Index ETF`, etc.) and:

1. Click **`+`** next to the existing view tabs.
2. Choose **Gallery**.
3. Name it something clear: `Gallery`, `Card Wall`, or `Image View`.
4. In the new view, click **`···` → Layout** and configure:
   - **Card preview**: the `Image` property, or `Page cover` on Owned Cards
   - **Card size**: `Medium` for browsing, `Large` for showcase boards
   - **Card preview**: **Fit image** if you want the full card uncropped, **Page cover** for an edge-to-edge look
5. Under **Properties**, hide everything except 2–4 fields you want under each tile — typically:
   - Card Catalog: `Name`, `Rarity`, `Set Name`
   - Master Set: `Name`, `Variant`, `Rarity`
   - Luffy Index: `Name`, `Market Price`, `Index Weight`
6. **Sort** and **Filter** as you would any other view. Two especially useful presets:
   - Filter `Owned = true` → "My Wall" view: only the cards you actually own, as a wall of art
   - Filter `Owned = false`, sort by `Market Price` asc → cheap missing cards (buy-target gallery)

## Recommended gallery views per board

### Card Catalog → "Set Wall"
- Group: implicit (don't group), filter `Set Code = OP-01` per view, duplicate the view per set
- Card preview: `Image`
- Card size: Medium
- Visible properties: `Name`, `Rarity`, `Color`

### Master Set → "Master Set Tracker"
- Card preview: `Image`
- Sort: `Variant` asc, then `Card ID` asc (base before parallel, in number order)
- Visible properties: `Name`, `Variant`, `Rarity`
- Color-tag the `Variant` select chips (already configured in the schema) so base/parallel/alt-art/promo are visually distinct

### Master Set → "Need List"
- Same as Master Set Tracker, but filter `Owned = false` and sort by `Rarity` (Leaders + Secret Rares first)
- Use this view when you're at a card shop and want to scan against a missing-list

### Luffy Index ETF → "Index Holdings"
- Card preview: `Image`
- Sort: `Index Weight` desc (biggest weighted card first)
- Visible properties: `Name`, `Market Price`, `Index Weight`
- Pin this as the default view on the Luffy Index page — the gallery is the dashboard

### Luffy Index ETF → "Owned"
- Filter `Owned = true`, sort by `Market Price` desc
- Visible properties: `Name`, `Market Price`
- Useful as "what do I currently hold of the Luffy index"

### Owned Cards → "My Collection Wall"
- Card preview: `Page cover`
- Card size: Large
- Visible properties: `Card ID`, `Owner`, `Quantity`, `Market Price`
- Best on the per-owner page in the Crew workspace

### Owned Cards → "Binder by Set"
- Card preview: `Page cover`
- Group: `Set Code`
- Sort: `Card ID` ascending
- Visible properties: `Quantity`, `Rarity`, `Market Price`
- Best for making OP-01 / OP-05 progress feel like a physical binder

### Owned Cards → "Trophy Case"
- Card preview: `Page cover`
- Filter: `Market Price` is not empty
- Sort: `Market Price` descending
- Card size: Large
- Visible properties: `Market Price`, `Owner`, `Quantity`
- Best for the Slack follow-up: "which is the most expensive?"

## Why we don't auto-create gallery views in code

Notion views (table / board / gallery / calendar / timeline) are per-workspace UI configuration. The Workers SDK can declare and populate **databases**, not views. Views live in the Notion page tree where the database is embedded, and they're set up once by the workspace owner.

So: the gallery view is a **per-workspace one-time setup** — not something each sync run rewrites. If you copy this workspace to a new Notion account, follow the recipe above to recreate the views.

## Suggested page layout for a "Card Wall" landing page

Create a single Notion page called **`Card Wall`** that pulls each of the gallery views above into linked database blocks. Layout idea:

```
# Card Wall

## Master Set tracker
[Linked database: Master Set · Master Set Tracker view]

## Owned only
[Linked database: Master Set · Need List view]

## Luffy index
[Linked database: Luffy Index ETF · Index Holdings view]

## Recently added to my collection
[Linked database: Owned Cards · My Collection Wall view, sort by Acquisition Date desc, limit 24]

## Trophy case
[Linked database: Owned Cards · Trophy Case view, sort by Market Price desc]

## Binder by set
[Linked database: Owned Cards · Binder by Set view, grouped by Set Code]
```

That gives collectors one stop for visual browsing across every gallery-enabled database. Pair it with the **Set Completion Dashboard** (which already has progress bars per the analytics PR) on the same page and you have the whole "what do I own, what's it worth, what does it look like" experience in one Notion page.

## When you want a brand-new gallery-only board

If you want a stripped-down gallery DB with **no other view clutter** (e.g. a kid-friendly "look at the pretty cards" surface), declare a new managed database in `src/index.ts`:

```ts
const cardGallery = worker.database("cardGallery", {
  type: "managed",
  initialTitle: "Card Gallery",
  primaryKeyProperty: "Variant ID",
  schema: {
    properties: {
      Name: Schema.title(),
      "Variant ID": Schema.richText(),
      Image: Schema.url(),
      Set: Schema.richText(),
      Rarity: Schema.richText(),
      Color: Schema.richText(),
    },
  },
});
```

Then wire a sync that copies from `listAllOptcgSetCards()` into this minimal schema. In Notion, only add a Gallery view to this database and hide everything else. It becomes the dedicated wall.

Not in this PR — the existing databases already cover the use case once you add a Gallery view per the recipe above.
