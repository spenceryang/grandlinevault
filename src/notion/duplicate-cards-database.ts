import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const DUPLICATE_CARDS_DATABASE_KEY = "duplicateCards";

export const duplicateCardsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Duplicate Cards",
	primaryKeyProperty: "Duplicate ID" as const,
	schema: {
		databaseIcon: emojiIcon("🔁"),
		properties: {
			// Title + pk anchor every view.
			"Card Name": Schema.title(),
			"Duplicate ID": Schema.richText(),

			// Status chip up front — Keep / Trade / Sell / Gift is the
			// decision users make on this board.
			Status: Schema.select([
				{ name: "Keep", color: "gray" },
				{ name: "Trade", color: "blue" },
				{ name: "Sell", color: "green" },
				{ name: "Gift", color: "purple" },
			]),

			// Headline tradeable money first, then total + per-copy market.
			"Tradeable Value": Schema.number("dollar"),
			"Total Value": Schema.number("dollar"),
			"Current Market Price": Schema.number("dollar"),

			// Count signals.
			"Available Count": Schema.number(),
			"Total Owned": Schema.number(),

			// Owner near the end of the heavy block.
			Owner: Schema.richText(),

			// Machine identifier last.
			"Card ID": Schema.richText(),
		},
	},
};

export const DUPLICATE_OWNER_SUMMARY_DATABASE_KEY = "duplicateOwnerSummary";

export const duplicateOwnerSummaryDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Duplicate Owner Summary",
	primaryKeyProperty: "Owner" as const,
	schema: {
		databaseIcon: emojiIcon("📦"),
		properties: {
			Owner: Schema.title(),

			// Dollar headline first.
			"Total Tradeable Value": Schema.number("dollar"),
			"Total Duplicate Value": Schema.number("dollar"),

			// Copy counts.
			"Total Tradeable Copies": Schema.number(),
			"Total Duplicate Copies": Schema.number(),
			"Unique Duplicate Cards": Schema.number(),
		},
	},
};
