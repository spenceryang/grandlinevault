import * as Schema from "@notionhq/workers/schema";

export const DUPLICATE_CARDS_DATABASE_KEY = "duplicateCards";

export const duplicateCardsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Duplicate Cards",
	primaryKeyProperty: "Duplicate ID" as const,
	schema: {
		properties: {
			"Card Name": Schema.title(),
			"Duplicate ID": Schema.richText(),
			Owner: Schema.richText(),
			"Card ID": Schema.richText(),
			"Total Owned": Schema.number(),
			"Available Count": Schema.number(),
			"Current Market Price": Schema.number("dollar"),
			"Total Value": Schema.number("dollar"),
			"Tradeable Value": Schema.number("dollar"),
			Status: Schema.select([
				{ name: "Keep", color: "gray" },
				{ name: "Trade", color: "blue" },
				{ name: "Sell", color: "green" },
				{ name: "Gift", color: "purple" },
			]),
		},
	},
};

export const DUPLICATE_OWNER_SUMMARY_DATABASE_KEY = "duplicateOwnerSummary";

export const duplicateOwnerSummaryDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Duplicate Owner Summary",
	primaryKeyProperty: "Owner" as const,
	schema: {
		properties: {
			Owner: Schema.title(),
			"Unique Duplicate Cards": Schema.number(),
			"Total Duplicate Copies": Schema.number(),
			"Total Tradeable Copies": Schema.number(),
			"Total Duplicate Value": Schema.number("dollar"),
			"Total Tradeable Value": Schema.number("dollar"),
		},
	},
};
