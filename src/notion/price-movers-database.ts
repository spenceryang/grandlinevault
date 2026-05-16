import * as Schema from "@notionhq/workers/schema";

export const PRICE_MOVERS_DATABASE_KEY = "priceMovers";

export const priceMoversDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Price Movers",
	primaryKeyProperty: "Mover ID" as const,
	schema: {
		properties: {
			"Card Name": Schema.title(),
			"Mover ID": Schema.richText(),
			"Card ID": Schema.richText(),
			Direction: Schema.select([
				{ name: "Gainer", color: "green" },
				{ name: "Loser", color: "red" },
			]),
			"Window (days)": Schema.number(),
			"Old Price": Schema.number("dollar"),
			"New Price": Schema.number("dollar"),
			"Dollar Change": Schema.number("dollar"),
			"Percent Change": Schema.number("percent"),
			"Old Captured At": Schema.date(),
			"New Captured At": Schema.date(),
		},
	},
};
