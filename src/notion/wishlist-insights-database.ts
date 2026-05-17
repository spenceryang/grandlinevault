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
			// Title + pk anchor every view.
			"Card Name": Schema.title(),
			"Insight ID": Schema.richText(),

			// Target Hit is the action signal — the column users glance
			// at first to know "buy now?"
			"Target Hit": Schema.checkbox(),

			// Priority + Status chips next.
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

			// Headline pricing deltas — Percent Below Target can render
			// as a bar for the "how close to target" visualization.
			"Percent Below Target": Schema.number("percent"),
			"Dollars Below Target": Schema.number("dollar"),
			"Current Market Price": Schema.number("dollar"),
			"Target Price": Schema.number("dollar"),

			// Owner near the end of the heavy block.
			Owner: Schema.richText(),

			// Free-form reason last.
			Reason: Schema.richText(),

			// Machine identifier last.
			"Card ID": Schema.richText(),
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

			// Dollar headline first — the budget board is literally
			// about money.
			"Total Target Spend": Schema.number("dollar"),
			"Total Current Spend": Schema.number("dollar"),
			"Savings at Target": Schema.number("dollar"),

			// Counts.
			"Open Items": Schema.number(),
			"Total Items": Schema.number(),
		},
	},
};
