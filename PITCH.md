# Grand Line Vault — pitch (initial thoughts)

## The one-liner

**Grand Line Vault turns Notion into the easiest place to own a card collection.** You snap a photo from wherever you are, the system identifies the card, fills in everything worth knowing about it, and the card shows up in your collection alongside everything else you own — searchable, browseable, financially legible, and shareable with a crew.

## What we're optimizing for

Collectors spend their attention in three places: **getting cards in**, **looking at what they own**, and **deciding what to do next**. Most tools nail one of those at the cost of the others. We're trying to do all three in a single Notion workspace because Notion is already where everything else in your life lives — your trip plans, your notes, your work doc.

## Why this matters

The card market is enormous: sealed product, singles, grading, marketplaces, content, and local communities all point at the same underlying behavior — people are emotionally and financially invested in small pieces of cardboard. But the individual collector's workflow is still fragmented. A collector may buy in one place, track value in another, keep deck ideas in a third, and show off screenshots in a group chat.

Grand Line Vault starts with the personal collector because that is where the daily pain is. The product should make someone proud to open their collection, proud to share it, and confident enough to ask, "what should I do next?" The market is big, but the wedge is intimate: **make one person's collection feel alive.**

## Beyond the personal collector — shops, vendors, deckbuilders, and tournament hosts

The same Notion-native model that helps an individual collector also serves several adjacent audiences. None of these needed a separate product to be built — they're the same workspace with different default views.

### Standalone deckbuilders + collection organizers

The shipped path doesn't force you to be a "completionist collector" to get value. Two practical standalone uses on day one:

- **Decklist organizing** — the `Decks` + `Decklist Entries` databases (with the OPTCG validator) work even if your Owned Cards table is mostly empty. Drop in cards you're brewing, group by Slot or Color, render as a card-list table OR a Card Wall gallery — the same data two ways. Useful for "I have ten brews in progress, I want to compare them" without committing to scanning every binder.
- **Deck generation from your collection** — once Owned Cards has even a partial collection, the OP Battle worker auto-builds permanent legal-ish Battle Decks per owner, sorted by your strongest available leader. That same primitive (build-a-deck-from-what-you-own) is a deck-suggestion engine for standalone deckbuilders, not just battle simulations.
- **Collection organization without the rest of the pipeline** — Owned Cards + Master Set + Set Completion Dashboard are useful on their own. A user who just wants "my binder in Notion, with progress bars" stops at that layer and ignores Trade Matcher, Price Movers, etc. The product gracefully degrades to the subset you actually want.

### Card shops + online vendors

For **card shops, online vendors, and high-volume sellers**, the same workspace becomes an inventory + dashboard tool they didn't have before:

- **Inventory tracking that doesn't fight you** — a card shop with thousands of singles can list each card as an Owned Card row, with quantity, condition, scan provenance, and live market price. The Card Wall + Master Set views double as a customer-facing visual catalog.
- **Duplicate management at scale** — the Duplicate Cards dashboard already surfaces tradeable copies + a "Sell" status per row. For a vendor that pulls cases weekly, this becomes the shipping queue: filter `Status = Sell`, sort by tradeable value desc, print labels off the top of the list.
- **Per-card asking price** — the same `Wishlist Insights` price-target structure flips for sellers: set the *floor* you'll let a card go for; when market price rises above floor, the row surfaces as "list it now."
- **Multi-user crews → multi-staff shops** — the existing Owner column already separates inventory by person. A two-employee shop can run the same workspace with one row per employee's pulls; rolled-up dashboards still show shop-wide totals.
- **Customer-facing share graphics** — Twitter / IG-story / OG share graphics that already exist for collectors become free marketing for shops. "Trade Night Drop" stories, "New restock" feed posts, "this case had a Charizard" pulls — all generated from the same Notion data.
- **Inventory health insights** — Price Movers shows what's appreciating in your back stock; Set Completion shows which sets you're sealed-product-heavy on; Trade Matcher (cross-store between sister shops) is a small extension of the existing logic.

### In-house tournaments at card shops

Shops that host **trade nights, league play, or in-house tournaments** can use the OP Battle worker as the bracket and result store without standing up tournament software:

- **Permanent owner decks** — Battle Decks rows hold each entrant's submitted decklist (auto-built from their Owned Cards or hand-curated). The decks persist between events so the same player's "Tournament Deck" is just one row to update.
- **Match results as Battle Run rows** — every recorded round writes a Battle Run page (player A vs player B, winner, turn count, deck snapshots). The Notion database becomes the tournament's match log without a separate scoring sheet.
- **Standings via Notion roll-ups** — group Battle Runs by Winner, count, sort — instant standings table. Group by Player, sum wins/losses — round-robin scoreboard. No formulas the shop has to write.
- **Replayable** — because each match writes a row with both deck snapshots, the shop owner can re-run popular matchups later as "simulated rematches" for content / a Discord write-up.

The product is collector-first on the demo path, but the inventory + dashboards + deck + tournament surface is **the same tool a small card vendor or league host would buy on day one** — no separate "vendor mode" or "tournament mode" to build, just better defaults on views and a shop-tier seat in Notion.

## How we make it easy

### Easy intake — meet collectors where they already are

There's no single "right" way to scan a card. So we don't pick one — we let the user pick.

- **Notion upload** — drop a photo into the Scan Inbox database. The default.
- **Email (Resend Inbound)** — collectors email a card photo to a configured address. The email becomes a Scan Inbox row.
- **Discord bot** — drop a photo in a channel; the bot creates a Scan Inbox row tied to your Discord identity. Great for groups already brewing decks together.
- **Slack** — same pattern as Discord, for crews on Slack.
- **iMessage / Apple Shortcuts** — planned; the cheapest path reuses the email intake.

Adding a new intake method is a one-screen contract: accept an image + an owner identifier, write a Scan Inbox row. Every method funnels into the same downstream pipeline. **The user picks how they want to scan; we adapt.**

### Scan → recognize → enrich → store, automatically

After a Scan Inbox row lands, the Worker does the boring work:

1. **Recognize** the card image (GIBL recognition + English-only filter so foreign-language and low-confidence scans get queued for review rather than silently polluting the collection).
2. **Enrich** with canonical data from the OPTCG API — name, set, rarity, color, type, cost, power, counter, attribute, art, current market price.
3. **Store** the enriched record in the user's Owned Cards database with quantity, condition, pre-grade estimate, and scan provenance.

Front-only scans work; front+back unlocks the pre-grade estimate (centering / corners / edges / surface signals → "Likely PSA 8–9 range, medium confidence"). Framed explicitly as a **pre-grade estimate**, never an official grade.

### See your collection — visually

Notion gives us free gallery views, board views, table views, and progress-bar rendering on percent properties. We use all of them:

- **Card Wall** gallery view of every card you own, with each owned card's image promoted to the page cover so the collection feels like a digital binder rather than a spreadsheet
- **Trophy Case** sorted by market price so collectors can showcase the cards they're proudest of
- **Master Set Dashboard** — every printing per set, base/parallel/alt-art/promo classified, with a `Completion %` column that renders as a per-set progress bar
- **Luffy Index ETF** + **Character Indices** (Zoro, Sanji, Strawhat crew, Yonko, Donquixote) — price-weighted index per character with `Index Weight` rendered as a bar
- **Set Completion Dashboard** — per-set progress + total + owned market value, daily refresh
- **Archetype Completion** — per-sub-type (Straw Hat Crew, Whitebeard Pirates, Marines, etc.) progress, the orthogonal axis to set completion

Every card-bearing database has an Image property so the Gallery view "just works" — instant card-wall browsing, zero schema changes. The Master Set ships with a `BINDER_DENSITY` env-var toggle (`small` / `medium` / `large`) that re-renders every card thumbnail at 280 / 360 / 480px via the wsrv.nl proxy, so you can flip the binder between "tight grid of every printing" and "showcase wall of hero cards" without leaving Notion. Three recommended views ship in [BINDER.md](./BINDER.md): **Binder** (all printings, unowned go grayscale), **Owned Only** (`Owned is checked` — the screenshot view), and **Missing** (`Owned is not checked` — the drives the wishlist).

### See what to chase next

Owning cards is half the fun. The other half is figuring out what to chase.

- **Related cards** — given any card, score the top-N most-related printings (same character, same set, same color, shared sub-types, similar cost, same rarity). Lives as both a managed Notion DB and an on-demand library call.
- **Price movers** — top gainers and losers over a rolling 7-day / 30-day window, diffed from the daily `priceSnapshots` time-series. "What just spiked" without any new API calls.
- **Trade matcher** — cross-user join: Spencer's duplicate Luffys meet Jarren's wishlist Luffys, the system suggests the trade.
- **Server-side name search** — `filterCatalogCards({ cardName: "Zoro", color: "Red", rarity: "SR" })` returns just those 4 cards instead of pulling the 3,330-card catalog client-side. Agents and humans both use it.

### Decklists, not just collections

Collectors play. So the workspace doubles as a deck builder:

- **Decks** database with one row per deck (Leader, Format, Status, Card Count, Estimated Value).
- **Decklist Entries** with two-way relation to Decks. The same data renders as a **card list** (table grouped by Slot, sorted by Cost) AND as an **image gallery** (Card Wall for the deck). Switch views, the data stays in sync.
- **OPTCG validator** — `validateOptcgDecklist` checks construction rules (1 Leader, 50 main deck, 10 DON!!, max 4 copies, color identity warnings).

This area is intentionally still growing. The shipped template proves the Notion-native shape; the next layer is faster deck entry, better wishlist-to-deck gap analysis, and agent prompts like "what cards do I need to finish this Zoro deck?"

### Notion-native = agent-native

Every dataset is a Notion database, which means the Custom Agent can answer in plain English:

- "What cards am I missing from OP-05?"
- "What's my biggest Luffy holding?"
- "Which duplicates could I trade with Jarren?"
- "Show me my Red SR Zoros."
- "What just dropped 20% this week?"

No separate API layer to query — the data IS the product.

## Why Notion (not a web app)

A Notion-native build means:

- **Zero login friction** — collectors already live in Notion
- **Free multi-user** — workspace permissions handle Owner separation; each crew member sees only their own owned cards but shares the same canonical catalog
- **Free dashboards** — gallery, board, calendar, chart views are built in
- **Free LLM surface** — Notion's Custom Agents are already wired into the same data
- **Portable** — every database can be exported, duplicated, embedded

The Worker is the brain; Notion is the body.

## What's shipped (as of this writing)

- Recognition + enrichment pipeline (GIBL + OPTCG)
- Owned Cards, Wishlists, Scan Inbox, Card Catalog, Price Snapshots, Master Set, Set Completion Dashboard
- Luffy Index ETF + Character Indices (Zoro, Sanji, Strawhat, Yonko, Donquixote)
- Decklist template (card list + image gallery views, OPTCG validator)
- Related Cards scoring engine + Notion board
- Price Movers engine + Notion board
- Trade Matcher engine + Notion board
- Archetype Completion engine + Notion board
- Server-side `cardName` search wired through every catalog/starter/promo filter
- Offline OP15-EB04 seed for demo resilience
- Resend Inbound parser + signature verification (email-as-intake)
- Resend Outbound templates (scan receipts, trade matches, promos)
- Discord bot (draft) + Slack intake
- PSA provider scaffolds (cert verification, population, auction prices, price guide, card facts, OAuth)
- TCGdex provider library (Pokémon TCG, isolated namespace)
- PriceCharting provider library (graded prices)

## What we're going for in the demo

Show the **first 30 seconds** are magical:
1. Photo lands (any intake)
2. Card appears in the gallery
3. Open the card page — full enriched record, image, market price, set membership, related cards
4. Ask the Agent: "what am I missing from OP-05?" — answer with a count + a missing-cards gallery
5. Open the Set Completion Dashboard — see the progress bar tick up

The judge takeaway:

> **Notion isn't just storing this collection. It IS the product.**

## What we're explicitly not chasing (yet)

- Full marketplace checkout (P2 — start as outbound marketplace links, then graduate to checkout only after recommendations and wishlists are reliable)
- Official PSA grading replacement (we frame everything as **pre-grade** estimates)
- Japanese / Chinese / multilingual card support (English-only for P0)
- Mobile app outside Notion (the mobile path is "Apple Shortcut emails the image, Resend Inbound picks it up")
- Deck simulator
- High-frequency intraday trading dashboard

## Next product bets

- **Wishlists** — make chase cards more actionable: target price, priority, reason, set-completion impact, and "why this card next?"
- **Deck builder** — move from a good storage template to an assistant that can compare a decklist against your owned cards and wishlist the missing pieces.
- **Showcase / sharing** — visual collection walls and share graphics should make collectors proud to send the Vault to friends.
- **Marketplace links** — start with outbound links for recommended cards. Do not attempt full checkout until the recommendation layer is trusted.
- **Vendor / shop seats** — the inventory + duplicate + sharing surface is already shop-friendly. The bet is whether to package it as a "Shop Vault" workspace template with curated default views (Inventory, Trade Block, Sell Pile, Restock Alerts) and a small set of customer-facing share graphics tuned for restock announcements.

## Open questions

1. Best one demo card to highlight in the live walkthrough? (Current bias: OP05-119 Luffy Manga — visually iconic + on the gainer board)
2. How much of the multi-game expansion (Pokémon TCGdex, future Magic / Lorcana) do we show in the pitch vs. keep as "the rails are there if you want them later"?
3. Pre-grade estimate UI — show the example output inline, or keep it as a "look how this also works" beat?
4. Do we walk through the trade matcher live (requires a multi-user state in the demo workspace) or just describe it?

---

_This document is initial thoughts. Spencer to review and shape the formal pitch._
