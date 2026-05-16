# Notion Workspace Setup

Grand Line Vault uses two kinds of databases:

1. **Worker-managed sync databases**
   - `Grand Line Vault · Card Catalog`
   - `Grand Line Vault · Price Snapshots`
2. **User-created workflow databases**
   - `Owned Cards`
   - `Wishlists`

The Worker-managed databases are created by deployment. The user-created databases should live in the actual workspace that collectors use day to day.

## Owned Cards database

Create these properties exactly:

| Property | Type |
| --- | --- |
| Name | Title |
| Owner | Text |
| Card ID | Text |
| Quantity | Number |
| Condition | Text |
| Pre-grade estimate | Text |
| Scan image | Files & media |

Recommended views:

- Gallery: grouped by Owner
- Table: all cards
- Duplicates: filter `Quantity > 1`

## Wishlists database

Recommended properties:

| Property | Type |
| --- | --- |
| Name | Title |
| Owner | Text |
| Card ID | Text |
| Priority | Select |
| Target price | Number |
| Status | Select |
| Reason | Text |

## Suggested top-level pages

```text
Grand Line Vault
├── Scan Inbox
├── My Collection
├── Crew Collection
├── Wishlists
├── Portfolio Dashboard
└── Admin
```

## Suggested dashboard widgets

- total portfolio value
- collection by rarity
- cards by set
- duplicate count
- recent additions

## Demo path

1. Ask the Agent to identify a card from an image URL.
2. Ask the Agent to add the matched card to an owner collection.
3. Open the Gallery view.
4. Show portfolio charts from `Price Snapshots`.
