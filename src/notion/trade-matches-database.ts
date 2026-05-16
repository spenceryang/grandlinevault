import * as Schema from "@notionhq/workers/schema";

export const TRADE_MATCHES_DATABASE_KEY = "tradeMatches";

export const tradeMatchesDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Trade Matches",
	primaryKeyProperty: "Match ID" as const,
	schema: {
		properties: {
			"Card Name": Schema.title(),
			"Match ID": Schema.richText(),
			"From Owner": Schema.richText(),
			"To Owner": Schema.richText(),
			"Card ID": Schema.richText(),
			"Available Quantity": Schema.number(),
			Priority: Schema.select([
				{ name: "High", color: "red" },
				{ name: "Medium", color: "yellow" },
				{ name: "Low", color: "gray" },
				{ name: "Unset", color: "default" },
			]),
			"Target Price": Schema.number("dollar"),
			Status: Schema.select([
				{ name: "Suggested", color: "blue" },
				{ name: "Proposed", color: "yellow" },
				{ name: "Accepted", color: "green" },
				{ name: "Declined", color: "red" },
				{ name: "Completed", color: "gray" },
			]),
		},
	},
};
