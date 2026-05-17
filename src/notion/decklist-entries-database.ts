import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";
import { DECKS_DATABASE_KEY } from "./decks-database.js";

export const DECKLIST_ENTRIES_DATABASE_KEY = "decklistEntries";

export const decklistEntriesDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Decklist Entries",
	primaryKeyProperty: "Entry ID" as const,
	schema: {
		databaseIcon: emojiIcon("📜"),
		properties: {
			// Title + pk anchor every view.
			"Card Name": Schema.title(),
			"Entry ID": Schema.richText(),

			// Relation up front — every view typically filters by Deck.
			Deck: Schema.relation(DECKS_DATABASE_KEY, {
				twoWay: true,
				relatedPropertyName: "Cards",
			}),

			// Slot chip is the headline grouping (the "Card List" view
			// groups by Slot). Quantity is the headline number.
			Slot: Schema.select([
				{ name: "Leader", color: "yellow" },
				{ name: "Character", color: "blue" },
				{ name: "Event", color: "purple" },
				{ name: "Stage", color: "green" },
				{ name: "DON", color: "orange" },
			]),
			Quantity: Schema.number(),

			// Image as `file` so the "Card Wall" gallery uses it as cover.
			"Card Image": Schema.file(),

			// Game-relevant numerics.
			Cost: Schema.number(),
			Power: Schema.number(),
			"Market Price": Schema.number("dollar"),

			// Card metadata.
			Color: Schema.richText(),
			Rarity: Schema.richText(),
			Set: Schema.richText(),

			// Machine identifier last.
			"Card ID": Schema.richText(),
		},
	},
};
