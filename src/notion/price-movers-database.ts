import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const PRICE_MOVERS_DATABASE_KEY = "priceMovers";

export const priceMoversDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Price Movers",
	primaryKeyProperty: "Mover ID" as const,
	schema: {
		databaseIcon: emojiIcon("📈"),
		properties: {
			// Title + pk anchor every view.
			"Card Name": Schema.title(),
			"Mover ID": Schema.richText(),

			// Direction chip is the most eye-catching column — green for
			// gainers, red for losers. Filter views ride on this.
			Direction: Schema.select([
				{ name: "Gainer", color: "green" },
				{ name: "Loser", color: "red" },
			]),

			// Headline metrics — Percent Change can render as a bar.
			"Percent Change": Schema.number("percent"),
			"Dollar Change": Schema.number("dollar"),

			// Window scoping (7 / 30 days).
			"Window (days)": Schema.number(),

			// The actual prices that produced the change.
			"Old Price": Schema.number("dollar"),
			"New Price": Schema.number("dollar"),

			// Dates near the end.
			"New Captured At": Schema.date(),
			"Old Captured At": Schema.date(),

			// Card identifier last.
			"Card ID": Schema.richText(),
		},
	},
};
