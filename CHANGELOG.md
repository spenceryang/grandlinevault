# Changelog

## v0.2.0 — OPTCG API integration

Grand Line Vault now has live OPTCG API hooks merged from the API PRs and exposed through the deployed Notion Worker.

### Included

- OPTCG API card lookup by card ID
- OPTCG API set lookup by set ID
- OPTCG API card filtering by color, type, cost, and rarity
- OPTCG API all-sets listing
- master-set variant classification and completion summary
- OPTCG-backed Card Catalog sync
- OPTCG-backed Price Snapshot sync
- OPTCG-backed Master Set sync
- Agent tools:
  - `identifyAndEnrichCard`
  - `getCardDetails`
  - `getSetCards`
  - `filterCatalogCards`
  - `listAllSets`
  - `summarizeMasterSet`

### Live validation

- `getCardDetails` successfully returned OP01-001 variants, images, rarity, type, and market prices.
- `listAllSets` successfully returned the live OPTCG set list.
- Local validation passed with 35 tests, typecheck, and build.

### Notion updates

- Owned Cards now supports API-enriched properties:
  - Set Code
  - Set Name
  - Rarity
  - Color
  - Card Type
  - Market Price

## v0.1.0 — Live scaffold release

Grand Line Vault now has a public repo, a deployed Notion Worker, and a live Notion workspace scaffold.

### Included

- Notion Worker project scaffold
- Worker-managed Card Catalog sync schema
- Worker-managed Price Snapshots sync schema
- English-only recognition candidate classification
- owned-card creation tool
- collection summary tool
- duplicate-card listing tool
- live Notion data-source wiring support
- workspace setup guide
- product specification
- unit tests for card IDs, recognition rules, grading estimates, and collection summaries

### Live Notion setup completed

- Grand Line Vault home page created in Notion
- Scan Inbox database created
- Owned Cards database created
- Wishlists database created
- Worker environment configured with live Owned Cards / Wishlists data source IDs
- Worker redeployed after data-source wiring
- demo owned-card row seeded

### Still required for the full magic loop

Provide these Worker environment variables:

- `OPENAI_API_KEY`
- `CATALOG_FEED_URL`
- `PRICE_FEED_URL`

After those are configured, the next milestone is a real end-to-end scan:

```text
scan image → recognize English card → fetch canonical details → create card / owned copy → show collection state
```
