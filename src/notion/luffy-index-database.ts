import * as Schema from "@notionhq/workers/schema";

export const LUFFY_INDEX_DATABASE_KEY = "luffyIndex";

export const luffyIndexDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Luffy Index ETF",
	primaryKeyProperty: "Variant ID" as const,
	schema: {
		properties: {
			Name: Schema.title(),
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
