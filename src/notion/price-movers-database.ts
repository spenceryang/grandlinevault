import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";
import { MASTER_SET_DATABASE_KEY } from "./master-set-database.js";

export const PRICE_MOVERS_DATABASE_KEY = "priceMovers";

export const priceMoversDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Price Movers",
	primaryKeyProperty: "Mover ID" as const,
	schema: {
		databaseIcon: emojiIcon("📈"),
		properties: {
			"Card Name": Schema.title(),
			"Mover ID": Schema.richText(),
			"Card ID": Schema.richText(),
			// P2 scaffolding: link to Master Set via Variant ID. Sync wiring TBD.
			"Master Set Card": Schema.relation(MASTER_SET_DATABASE_KEY, {
				twoWay: false,
			}),
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
