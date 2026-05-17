import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const LUFFY_INDEX_DATABASE_KEY = "luffyIndex";

export const luffyIndexDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Luffy Index ETF",
	primaryKeyProperty: "Variant ID" as const,
	schema: {
		databaseIcon: emojiIcon("🏴‍☠️"),
		properties: {
			// Title + pk anchor every view.
			Name: Schema.title(),
			"Variant ID": Schema.richText(),

			// Headline metrics — what the index is literally about.
			// Toggle "Show as bar" on Index Weight in Notion.
			"Index Weight": Schema.number("percent"),
			"Market Price": Schema.number("dollar"),

			// Primary action + visual chip.
			Owned: Schema.checkbox(),
			Variant: Schema.select([
				{ name: "base", color: "default" },
				{ name: "parallel", color: "blue" },
				{ name: "alt-art", color: "purple" },
				{ name: "promo", color: "orange" },
			]),

			// Image as `file` so gallery views can use it as the card
			// cover — the "constituents wall" view of the index.
			Image: Schema.file(),

			// Card metadata.
			Rarity: Schema.richText(),
			"Card Type": Schema.richText(),
			"Set Name": Schema.richText(),

			// Machine identifiers last.
			"Base Card ID": Schema.richText(),
			"Set ID": Schema.richText(),
		},
	},
};
