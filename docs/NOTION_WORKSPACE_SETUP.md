# Notion Workspace Setup

Grand Line Vault uses two kinds of databases:

1. **Worker-managed sync databases**
   - `Grand Line Vault · Card Catalog`
   - `Grand Line Vault · Price Snapshots`
2. **User-created workflow databases**
   - `Scan Inbox`
   - `Owned Cards`
   - `Wishlists`

The Worker-managed databases are created by deployment. The user-created databases should live in the actual workspace that collectors use day to day.

## Scan Inbox database

Create these properties exactly:

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | Any label, e.g. `Scan · Luffy`. |
| Front image | Files & media | Upload the card-front image here. This is the automation trigger. |
| Back image | Files & media | Optional, reserved for grading/pre-grade improvements. |
| Owner | Text | Collector name; defaults to Spencer if blank. |
| Status | Select | `New`, `Processing`, `Matched`, `Needs Review`, `Rejected`. |
| Recognition result | Text | Worker-written result summary. |
| Confidence | Number | Worker-written recognition confidence. |
| Linked owned card | URL | Worker-written link to the created Owned Cards page. |
| Notes | Text | Manual notes/review. |

Current fallback flow:

```text
Upload Front image → keep Status = New → ask the Agent to run processScanInboxQueue
```

When Worker automation capabilities are enabled for the workspace, set `ENABLE_NOTION_AUTOMATIONS=1`, redeploy, and create this Notion database automation:

```text
When Front image is edited → Run Grand Line Vault Worker → Process Scan Inbox Upload
```

If you only want to process one row, use `processScanInboxPage` with the Scan Inbox page ID.

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

1. Create a Scan Inbox row.
2. Upload a card-front image to `Front image`.
3. Ask the Agent to run `processScanInboxQueue`.
4. Open the Owned Cards Gallery view.
5. Show portfolio charts from `Price Snapshots`.
