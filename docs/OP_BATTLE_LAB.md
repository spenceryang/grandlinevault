# OP Battle Lab

Grand Line Vault's battle simulator is a separate Notion Worker surface for testing how two owners' collections might clash.

The goal is not a tournament-judge rules engine. The goal is a Notion-native **battle lab**: pick two owners, auto-build permanent battle decks from their current Owned Cards, run a 100-game Monte Carlo simulation, and save the compact result in Notion.

Official baseline: Bandai's current One Piece Card Game rules page is the source of truth for rule direction: <https://en.onepiece-cardgame.com/rules/>.

## P0 product shape

### Worker

Entry point:

```ts
src/op-battle.ts
```

This is intentionally separate from `src/index.ts` so the live system can be presented as:

- `grand-line-vault` — collection, scan inbox, catalog, binder
- `op-battle` — deck generation, battle simulation, battle history

Both read the same user-created **Owned Cards** database.

### Notion databases

The Worker declares two managed schemas:

| Database | Key | Purpose |
|---|---|---|
| OP Battle · Battle Decks | `opBattleDecks` | Permanent generated deck pages |
| OP Battle · Battle Runs | `opBattleRuns` | Compact battle history / matchup results |

The tool writer uses data source IDs so generated decks and runs can be created directly from Agent commands:

```bash
BATTLE_DECKS_DATA_SOURCE_ID=
BATTLE_RUNS_DATA_SOURCE_ID=
```

### Agent commands

Recommended phrasing:

- "Build Spencer's strongest battle deck."
- "Build Waffle's best Animal Kingdom deck."
- "Run 100 battles: Spencer vs Jarren."
- "Simulate Waffle vs Spencer using strongest decks."
- "Explain why this matchup favored Spencer."
- "Archive old battle runs, keep the latest 10."

## Deck builder

The builder starts from all cards an owner currently has in **Owned Cards**:

```text
owner collection
→ choose best leader
→ infer leader color identity
→ filter playable cards
→ cap non-leader cards at 4 copies
→ build a 50-card main deck
→ save permanent Battle Deck page
```

Strategies:

- `strongest`
- `balanced`
- `straw-hat`
- `worst-generation`
- `animal-kingdom`

For P0, "strongest" is heuristic: rarity, market price, power, counter value, card type, cost curve, and color fit. It is deliberately explainable so user feedback can tune it.

## Simulation model

The simulator runs a default 100-game Monte Carlo matchup.

Modeled:

- 1 Leader
- 50-card main deck
- DON ramp pressure
- turn tempo
- leader color identity
- power/cost curve
- counter density
- event/stage/character role differences
- probabilistic draws and tempo swings

Not fully modeled yet:

- exact individual card text
- full effect timing windows
- replacement effects
- matchup-specific errata / bans / restrictions

Every Battle Run page includes this limitation note so the demo stays honest.

## Why compact run history

Notion pages should stay readable and below practical size limits. The P0 Battle Run stores:

- matchup
- winner
- win rates
- deck IDs
- key factors
- short sample narrative
- model limitations

It does **not** store every turn of every simulated game. The `archiveBattleRuns` tool marks old runs as `Archived` while keeping recent summaries active.

