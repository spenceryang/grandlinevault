import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const CHARACTER_INDEX_DATABASE_KEY = "characterIndex";

export const characterIndexDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Character Indices",
	primaryKeyProperty: "Entry ID" as const,
	schema: {
		databaseIcon: emojiIcon("⚔️"),
		properties: {
			// Title + pk anchor every view.
			Name: Schema.title(),
			"Entry ID": Schema.richText(),

			// Character chip is the headline grouping — filter views
			// per character ride on this column.
			Character: Schema.select([
				{ name: "Luffy", color: "red" },
				{ name: "Zoro", color: "green" },
				{ name: "Sanji", color: "yellow" },
				{ name: "Nami", color: "orange" },
				{ name: "Strawhat", color: "blue" },
				{ name: "Yonko", color: "purple" },
				{ name: "Donquixote", color: "pink" },
			]),

			// Metrics + action — what each row is ranked by.
			"Index Weight": Schema.number("percent"),
			"Market Price": Schema.number("dollar"),
			Owned: Schema.checkbox(),

			// Variant chip.
			Variant: Schema.select([
				{ name: "base", color: "default" },
				{ name: "parallel", color: "blue" },
				{ name: "alt-art", color: "purple" },
				{ name: "promo", color: "orange" },
			]),

			// Image as `file` — gallery view uses it as the card cover.
			Image: Schema.file(),

			// Card metadata.
			Rarity: Schema.richText(),
			"Card Type": Schema.richText(),
			"Set Name": Schema.richText(),

			// Machine identifiers last.
			"Variant ID": Schema.richText(),
			"Base Card ID": Schema.richText(),
			"Set ID": Schema.richText(),
		},
	},
};
