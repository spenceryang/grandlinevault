import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const WISHLIST_INSIGHTS_DATABASE_KEY = "wishlistInsights";

export const wishlistInsightsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Wishlist Insights",
	primaryKeyProperty: "Insight ID" as const,
	schema: {
		databaseIcon: emojiIcon("🌠"),
		properties: {
			"Card Name": Schema.title(),
			"Insight ID": Schema.richText(),
			Owner: Schema.richText(),
			"Card ID": Schema.richText(),
			Priority: Schema.select([
				{ name: "High", color: "red" },
				{ name: "Medium", color: "yellow" },
				{ name: "Low", color: "gray" },
				{ name: "Unset", color: "default" },
			]),
			// Native Notion Status — dot icon + kanban-by-group view.
			Status: Schema.status({
				groups: [
					{
						name: "To-do",
						options: [
							{ name: "Open", color: "blue" },
							{ name: "Snoozed", color: "gray" },
						],
					},
					{
						name: "Complete",
						options: [{ name: "Acquired", color: "green" }],
					},
				],
			}),
			"Target Price": Schema.number("dollar"),
			"Current Market Price": Schema.number("dollar"),
			"Dollars Below Target": Schema.number("dollar"),
			"Percent Below Target": Schema.number("percent"),
			"Target Hit": Schema.checkbox(),
			Reason: Schema.richText(),
		},
	},
};

export const WISHLIST_BUDGET_DATABASE_KEY = "wishlistBudget";

export const wishlistBudgetDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Wishlist Budget",
	primaryKeyProperty: "Owner" as const,
	schema: {
		databaseIcon: emojiIcon("💰"),
		properties: {
			Owner: Schema.title(),
			"Open Items": Schema.number(),
			"Total Items": Schema.number(),
			"Total Target Spend": Schema.number("dollar"),
			"Total Current Spend": Schema.number("dollar"),
			"Savings at Target": Schema.number("dollar"),
		},
	},
};
