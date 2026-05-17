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
			"Card Name": Schema.title(),
			"Entry ID": Schema.richText(),
			Deck: Schema.relation(DECKS_DATABASE_KEY, {
				twoWay: true,
				relatedPropertyName: "Cards",
			}),
			"Card ID": Schema.richText(),
			"Card Image": Schema.file(),
			Slot: Schema.select([
				{ name: "Leader", color: "yellow" },
				{ name: "Character", color: "blue" },
				{ name: "Event", color: "purple" },
				{ name: "Stage", color: "green" },
				{ name: "DON", color: "orange" },
			]),
			Set: Schema.richText(),
			Color: Schema.richText(),
			Rarity: Schema.richText(),
			Cost: Schema.number(),
			Power: Schema.number(),
			Quantity: Schema.number(),
			"Market Price": Schema.number("dollar"),
		},
	},
};
