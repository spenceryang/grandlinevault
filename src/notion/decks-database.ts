import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const DECKS_DATABASE_KEY = "decks";

export const decksDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Decks",
	primaryKeyProperty: "Deck ID" as const,
	schema: {
		databaseIcon: emojiIcon("🎴"),
		properties: {
			"Deck Name": Schema.title(),
			"Deck ID": Schema.richText(),
			Owner: Schema.richText(),
			"Leader Name": Schema.richText(),
			"Leader Card ID": Schema.richText(),
			"Leader Image": Schema.url(),
			Colors: Schema.richText(),
			Format: Schema.select([
				{ name: "Standard", color: "blue" },
				{ name: "Online", color: "green" },
				{ name: "Casual", color: "gray" },
				{ name: "Limited", color: "purple" },
			]),
			// Native Notion Status property — gets the dot icon, grouped
			// colors, and kanban-by-group view support.
			Status: Schema.status({
				groups: [
					{
						name: "To-do",
						options: [{ name: "Building", color: "yellow" }],
					},
					{
						name: "In progress",
						options: [{ name: "Active", color: "green" }],
					},
					{
						name: "Complete",
						options: [{ name: "Retired", color: "gray" }],
					},
				],
			}),
			"Card Count": Schema.number(),
			"Estimated Value": Schema.number("dollar"),
			Created: Schema.date(),
			Updated: Schema.date(),
			Notes: Schema.richText(),
		},
	},
};
