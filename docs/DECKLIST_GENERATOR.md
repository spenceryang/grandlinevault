# Decklist generator from bulk scans

Pure-logic engine that turns a **bulk scan** (one photo of 40 cards spread out, or 40 individual scans recorded in a batch) into a structured decklist that lands in the `Decks` + `Decklist Entries` boards introduced in the decklist template PR.

The vision: a collector lays out their entire 50-card deck + Leader on a table, takes one wide photo, and lets Grand Line Vault populate a Notion deck page with the correct slot per card, correct quantities, and validation against OPTCG construction rules. Whoever sees the Notion deck after gets a card-list view AND a gallery view of the deck.

## What this PR adds (library half)

### `src/lib/bulk-deck-scan.ts`
- `RecognizedScan` — one detected card from the multi-card photo, with `cardSetId`, `confidence`, optional `boundingBox`, optional `cardImageId` (for variants).
- `DecklistCardMetadata` — canonical card info (name, cardType, color, cost, marketPrice) — comes from the existing OPTCG lookup pipeline.
- `buildDecklistFromBulkScan(scans, enrichment, options)` → `BulkScanResult`:
  - Aggregates duplicates by `cardSetId` (case-insensitive)
  - Caps **Leader** quantity at 1 (OPTCG rule)
  - Caps non-Leader at `maxCopiesPerCard` (default 4 — OPTCG rule)
  - Filters out scans below `confidenceThreshold` (default 0.82 to match `RECOGNITION_CONFIDENCE_THRESHOLD`)
  - Reports `skippedLowConfidence`, `unknownCards`, `totalRecognized` so the reviewer can spot quality issues
- `classifyDecklistSlot(cardType)` — maps OPTCG card type → DecklistSlot (Leader / Character / Event / Stage / DON)
- `aggregateRecognizedScans(scans)` — bare count map for callers that want raw aggregation without enrichment

## What's NOT in this PR (yet)

- **Multi-card image segmentation** — the actual computer-vision step that splits "one photo of 40 cards" into 40 cropped sub-images. The library is built so it doesn't care HOW the scans were detected — that step is pluggable. Two practical paths:
  1. Use a recognition service that accepts a multi-card image and returns N `RecognizedScan` entries
  2. Use a tiny CV step (OpenCV / a CardOCR API) to detect rectangular boundaries, crop each sub-image, then feed each through the existing single-card recognizer
- **Notion writer** that takes `BulkScanResult` and creates the Decks + Decklist Entries rows — a small follow-up that combines the existing `decks-database.ts` + `decklist-entries-database.ts` configs with a Notion `pages.create` per row.

## How to wire it once segmentation is available

```ts
import { buildDecklistFromBulkScan } from "./lib/bulk-deck-scan.js";
import { segmentMultiCardImage } from "./providers/recognition.js"; // future: returns RecognizedScan[]
import { resolveOptcgCardDetails } from "./providers/optcgapi/resolve-card.js";

worker.tool("bulkScanToDeck", {
  schema: j.object({
    imageUrl: j.string(),
    deckName: j.string(),
    ownerName: j.string(),
  }),
  execute: async ({ imageUrl, deckName, ownerName }, context) => {
    const scans = await segmentMultiCardImage(imageUrl);
    const enrichment = new Map();
    for (const scan of scans) {
      const card = await resolveOptcgCardDetails(scan.cardSetId);
      if (card) enrichment.set(scan.cardSetId, card);
    }
    const result = buildDecklistFromBulkScan(scans, enrichment);
    await createDeckWithEntries(context.notion, deckName, ownerName, result.entries);
    return result;
  },
});
```

## Why this shape

By keeping recognition + enrichment + decklist construction as **three separable steps**, each can be swapped independently:

- Recognition vendor changes (GIBL → custom CV pipeline → vendor C) — only `segmentMultiCardImage` changes
- OPTCG enrichment goes offline — fall back to the bundled `seed-latest-set.json`, library still works
- Decklist construction is pure — easy to test in isolation, no Notion or HTTP dependency

## Tests

9 tests covering: slot classification (Leader/Character/Event/Stage/DON, unknown defaults), duplicate aggregation, Leader quantity cap = 1, non-Leader cap at `maxCopiesPerCard`, low-confidence skip, unknown-card pass-through, custom confidence threshold, case-insensitive count aggregation, empty-input handling.

## Draft

Per direction this branches off `main` as a draft — review the library + scoping note before recognition segmentation lands.
