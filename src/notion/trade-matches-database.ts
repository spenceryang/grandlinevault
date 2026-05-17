import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";
import { MASTER_SET_DATABASE_KEY } from "./master-set-database.js";

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
			// P2 scaffolding: link to Master Set via Variant ID. Sync wiring TBD.
			"Master Set Card": Schema.relation(MASTER_SET_DATABASE_KEY, {
				twoWay: false,
			}),
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
