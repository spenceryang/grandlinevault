import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const SET_ANALYTICS_DATABASE_KEY = "setAnalytics";

export const setAnalyticsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Set Completion Dashboard",
	primaryKeyProperty: "Set ID" as const,
	schema: {
		databaseIcon: emojiIcon("📊"),
		properties: {
			"Set Name": Schema.title(),
			"Set ID": Schema.richText(),
			"Total Cards": Schema.number(),
			Owned: Schema.number(),
			"Completion %": Schema.number("percent"),
			"Base Owned": Schema.number(),
			"Base Total": Schema.number(),
			"Parallel Owned": Schema.number(),
			"Parallel Total": Schema.number(),
			"Total Value": Schema.number("dollar"),
			"Owned Value": Schema.number("dollar"),
		},
	},
};

export const RARITY_ANALYTICS_DATABASE_KEY = "rarityAnalytics";

export const rarityAnalyticsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Rarity Breakdown",
	primaryKeyProperty: "Rarity" as const,
	schema: {
		databaseIcon: emojiIcon("✨"),
		properties: {
			Rarity: Schema.title(),
			Count: Schema.number(),
			Owned: Schema.number(),
			"Completion %": Schema.number("percent"),
			"Total Value": Schema.number("dollar"),
			"Owned Value": Schema.number("dollar"),
		},
	},
};

export const TOP_CARDS_DATABASE_KEY = "topCards";

export const topCardsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Top Cards by Value",
	primaryKeyProperty: "Variant ID" as const,
	schema: {
		databaseIcon: emojiIcon("💎"),
		properties: {
			Name: Schema.title(),
			"Variant ID": Schema.richText(),
			"Base Card ID": Schema.richText(),
			"Set ID": Schema.richText(),
			"Set Name": Schema.richText(),
			Rarity: Schema.richText(),
			"Market Price": Schema.number("dollar"),
			Owned: Schema.checkbox(),
		},
	},
};
