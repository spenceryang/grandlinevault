# Archetype / Sub-Type Completion

Tracks collection completion grouped by **archetype** — `Straw Hat Crew`, `Whitebeard Pirates`, `Marine`, `Yonko`, etc. Mirrors the Set Completion Dashboard but along the orthogonal "themed completion" axis.

Some collectors care most about set completion. Others care about character/faction completeness — "do I own every Straw Hat Crew card across all sets?" This template answers the second question.

## What this PR adds

### `src/lib/sub-type-completion.ts`
- `OPTCG_KNOWN_SUB_TYPES` — curated list of ~50 known One Piece TCG sub-types (crews, pirate factions, marines/government, regions, themed groups like Supernovas, species like Fish-Man / Mink / Giant). Spencer can extend this in-place.
- `extractSubTypes(value, dictionary?)` — parses optcgapi's space-separated `sub_types` field correctly: greedy longest-match against the dictionary, then any residual tokens are returned as-is. So `"Straw Hat Crew Supernovas"` → `["Straw Hat Crew", "Supernovas"]` (NOT `["Straw", "Hat", "Crew", "Supernovas"]`).
- `buildSubTypeCompletion(cards, ownedIds)` → `SubTypeCompletionRow[]` with `{ subType, total, owned, completionFraction, missingCardIds[] }`. Case-insensitive on owned id matching (matches by both `cardImageId` and `cardSetId`), sorted by total cards desc so the biggest archetypes are top.

### `src/notion/sub-type-completion-database.ts`
`subTypeCompletionDatabaseConfig` managed DB. Properties: **Sub Type** (title, pk), Total, Owned, **Completion %** (percent — toggle "Show as bar" for the cool per-archetype progress bars), Missing Count, **Missing Card IDs** (richText, comma-list for quick scanning).

## Why the dictionary approach

The optcgapi `sub_types` field has multi-word archetypes concatenated **without delimiters**:
- `"Straw Hat Crew Supernovas"` — actually 2 tags: `Straw Hat Crew` + `Supernovas`
- `"Animal Straw Hat Crew"` — 2 tags: `Straw Hat Crew` + `Animal`
- `"Donquixote Pirates"` — 1 tag

Whitespace splitting alone would over-count `"Straw"`, `"Hat"`, `"Crew"` as three separate archetypes. A known dictionary with greedy longest-match resolves this correctly. Unknown sub-types still pass through as residual tokens so nothing is lost — the dictionary just curates the well-known multi-word ones.

## How to wire it up

```ts
import { buildSubTypeCompletion } from "./lib/sub-type-completion.js";
import {
  SUB_TYPE_COMPLETION_DATABASE_KEY,
  subTypeCompletionDatabaseConfig,
} from "./notion/sub-type-completion-database.js";
import { listAllOptcgSetCards } from "./providers/optcgapi/list-all-set-cards.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";
import * as Builder from "@notionhq/workers/builder";

const archetypes = worker.database(
  SUB_TYPE_COMPLETION_DATABASE_KEY,
  subTypeCompletionDatabaseConfig,
);

worker.sync("syncSubTypeCompletion", {
  database: archetypes,
  mode: "replace",
  schedule: "1d",
  execute: async (_state, context) => {
    const all = await listAllOptcgSetCards();
    const ownedIds = new Set<string>();
    try {
      const owned = await fetchOwnedCards(context.notion);
      for (const c of owned) ownedIds.add(c.cardId);
    } catch (err) {
      console.warn("Owned cards unavailable; archetype completion will show 0%.", err);
    }
    const rows = buildSubTypeCompletion(
      all.map((c) => ({
        cardSetId: c.cardSetId,
        cardImageId: c.cardImageId,
        name: c.name,
        subTypes: c.subTypes,
      })),
      ownedIds,
    );
    return {
      changes: rows.map((r) => ({
        type: "upsert" as const,
        key: r.subType,
        properties: {
          "Sub Type": Builder.title(r.subType),
          Total: Builder.number(r.total),
          Owned: Builder.number(r.owned),
          "Completion %": Builder.number(r.completionFraction),
          "Missing Count": Builder.number(r.total - r.owned),
          "Missing Card IDs": Builder.richText(r.missingCardIds.join(", ")),
        },
      })),
      hasMore: false,
    };
  },
});
```

## Recommended Notion views

- **"Archetype Dashboard"** (table) — Default; sort by Total desc. The "what's biggest" overview.
- **"Closest to Complete"** — filter `Completion % >= 80%`, sort by Completion % desc. The "one push to finish" view.
- **"What's Missing"** — sort by Missing Count asc, filter `Completion % < 100%`. "Which faction is easiest to complete next."
- **"Bar Wall"** — same as Dashboard but toggle Completion % to "Show as bar" — every row is a progress bar at a glance.

## Future enhancements

- Drill-down: link each row to a filtered Master Set view (`Sub Types contains <archetype>`)
- Color-identity intersection (Straw Hat Crew × Red, etc.)
- Per-owner archetype dashboards (Casey's Straw Hat completion vs Jarren's)
- Auto-curate dictionary: scan upstream `sub_types` for previously-unseen tokens and surface them as candidates to add

The library shape doesn't preclude any of these — slot in additional columns and views.
