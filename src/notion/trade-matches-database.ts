import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const TRADE_MATCHES_DATABASE_KEY = "tradeMatches";

export const tradeMatchesDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Trade Matches",
	primaryKeyProperty: "Match ID" as const,
	schema: {
		databaseIcon: emojiIcon("🤝"),
		properties: {
			// Title + pk anchor every view.
			"Card Name": Schema.title(),
			"Match ID": Schema.richText(),

			// Status + Priority chips are the headline visuals. Filter
			// views (Suggested / Proposed / Accepted) ride on Status.
			Status: Schema.select([
				{ name: "Suggested", color: "blue" },
				{ name: "Proposed", color: "yellow" },
				{ name: "Accepted", color: "green" },
				{ name: "Declined", color: "red" },
				{ name: "Completed", color: "gray" },
			]),
			Priority: Schema.select([
				{ name: "High", color: "red" },
				{ name: "Medium", color: "yellow" },
				{ name: "Low", color: "gray" },
				{ name: "Unset", color: "default" },
			]),

			// Owners + quantity — the trade direction at a glance.
			"From Owner": Schema.richText(),
			"To Owner": Schema.richText(),
			"Available Quantity": Schema.number(),
			"Target Price": Schema.number("dollar"),

			// Card identifier last.
			"Card ID": Schema.richText(),
		},
	},
};
