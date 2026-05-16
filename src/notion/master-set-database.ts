import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const MASTER_SET_DATABASE_KEY = "masterSet";

export const masterSetDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Master Set",
	primaryKeyProperty: "Variant ID" as const,
	schema: {
		databaseIcon: emojiIcon("🗺️"),
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
			Color: Schema.richText(),
			"Card Type": Schema.richText(),
			Image: Schema.url(),
			Owned: Schema.checkbox(),
		},
	},
};
