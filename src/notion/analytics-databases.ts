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
			// Title + pk anchor the table.
			"Set Name": Schema.title(),
			"Set ID": Schema.richText(),

			// Headline metric — the bar/ring-renderable progress.
			// Toggle "Show as bar" on this column in Notion.
			"Completion %": Schema.number("percent"),

			// Owned vs total — the literal "X of Y" sits next to the bar.
			Owned: Schema.number(),
			"Total Cards": Schema.number(),

			// Dollar columns next — collectors care about value.
			"Owned Value": Schema.number("dollar"),
			"Total Value": Schema.number("dollar"),

			// Base / parallel split is the secondary metric set.
			"Base Owned": Schema.number(),
			"Base Total": Schema.number(),
			"Parallel Owned": Schema.number(),
			"Parallel Total": Schema.number(),
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

			// Bar-renderable progress sits right after the title.
			"Completion %": Schema.number("percent"),

			// Counts immediately after the bar.
			Owned: Schema.number(),
			Count: Schema.number(),

			// Dollars last.
			"Owned Value": Schema.number("dollar"),
			"Total Value": Schema.number("dollar"),
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
			// Title + pk first.
			Name: Schema.title(),
			"Variant ID": Schema.richText(),

			// Market Price is the headline of this board — it's literally
			// what the "top cards" are ranked by.
			"Market Price": Schema.number("dollar"),
			Owned: Schema.checkbox(),

			// Image as `file` so the gallery view can use it as the card
			// cover. Same pattern as the Master Set styling pass.
			Image: Schema.file(),

			// Card metadata.
			Rarity: Schema.richText(),
			"Set Name": Schema.richText(),

			// Machine identifiers last.
			"Base Card ID": Schema.richText(),
			"Set ID": Schema.richText(),
		},
	},
};
