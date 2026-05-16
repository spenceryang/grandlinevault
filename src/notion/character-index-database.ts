import * as Schema from "@notionhq/workers/schema";

export const CHARACTER_INDEX_DATABASE_KEY = "characterIndex";

export const characterIndexDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Character Indices",
	primaryKeyProperty: "Entry ID" as const,
	schema: {
		properties: {
			Name: Schema.title(),
			"Entry ID": Schema.richText(),
			Character: Schema.select([
				{ name: "Luffy", color: "red" },
				{ name: "Zoro", color: "green" },
				{ name: "Sanji", color: "yellow" },
				{ name: "Nami", color: "orange" },
				{ name: "Strawhat", color: "blue" },
				{ name: "Yonko", color: "purple" },
				{ name: "Donquixote", color: "pink" },
			]),
			"Variant ID": Schema.richText(),
			"Base Card ID": Schema.richText(),
			"Set ID": Schema.richText(),
			"Set Name": Schema.richText(),
			Variant: Schema.select([
				{ name: "base", color: "default" },
				{ name: "parallel", color: "blue" },
				{ name: "alt-art", color: "purple" },
				{ name: "promo", color: "orange" },
			]),
			Rarity: Schema.richText(),
			"Card Type": Schema.richText(),
			"Market Price": Schema.number("dollar"),
			"Index Weight": Schema.number("percent"),
			Image: Schema.url(),
			Owned: Schema.checkbox(),
		},
	},
};
