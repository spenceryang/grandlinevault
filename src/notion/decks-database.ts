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
			// Title + pk anchor every view.
			"Deck Name": Schema.title(),
			"Deck ID": Schema.richText(),

			// At-a-glance state — colored chips that drive the
			// "My Decks", "Building", "Active" views.
			Status: Schema.select([
				{ name: "Building", color: "yellow" },
				{ name: "Active", color: "green" },
				{ name: "Retired", color: "gray" },
			]),
			Format: Schema.select([
				{ name: "Standard", color: "blue" },
				{ name: "Online", color: "green" },
				{ name: "Casual", color: "gray" },
				{ name: "Limited", color: "purple" },
			]),

			// Headline numbers + the Leader visual.
			"Card Count": Schema.number(),
			"Estimated Value": Schema.number("dollar"),
			"Leader Image": Schema.file(),

			// Leader identity + colors.
			"Leader Name": Schema.richText(),
			Colors: Schema.richText(),

			// Owner.
			Owner: Schema.richText(),

			// Dates near the end.
			Updated: Schema.date(),
			Created: Schema.date(),

			// Machine identifier + free-form notes last.
			"Leader Card ID": Schema.richText(),
			Notes: Schema.richText(),
		},
	},
};
