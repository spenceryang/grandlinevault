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
			// Native Notion Status — dot icon + kanban-by-group view.
			Status: Schema.status({
				groups: [
					{
						name: "To-do",
						options: [{ name: "Suggested", color: "blue" }],
					},
					{
						name: "In progress",
						options: [
							{ name: "Proposed", color: "yellow" },
							{ name: "Accepted", color: "green" },
						],
					},
					{
						name: "Complete",
						options: [
							{ name: "Declined", color: "red" },
							{ name: "Completed", color: "gray" },
						],
					},
				],
			}),
		},
	},
};
