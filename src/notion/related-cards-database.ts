import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";
import { MASTER_SET_DATABASE_KEY } from "./master-set-database.js";

export const RELATED_CARDS_DATABASE_KEY = "relatedCards";

export const relatedCardsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Related Cards",
	primaryKeyProperty: "Relation ID" as const,
	schema: {
		databaseIcon: emojiIcon("🔗"),
		properties: {
			"Card Name": Schema.title(),
			"Relation ID": Schema.richText(),
			"Source Card ID": Schema.richText(),
			"Source Card Name": Schema.richText(),
			"Related Card ID": Schema.richText(),
			// P2 scaffolding: link source + related cards to Master Set via Variant ID. Sync wiring TBD.
			"Source Card": Schema.relation(MASTER_SET_DATABASE_KEY, {
				twoWay: false,
			}),
			"Related Card": Schema.relation(MASTER_SET_DATABASE_KEY, {
				twoWay: false,
			}),
			"Related Card Image": Schema.url(),
			Score: Schema.number(),
			Reasons: Schema.multiSelect([
				{ name: "same-character", color: "yellow" },
				{ name: "same-set", color: "blue" },
				{ name: "same-color", color: "red" },
				{ name: "same-type", color: "purple" },
				{ name: "shared-sub-types", color: "green" },
				{ name: "cost-curve", color: "orange" },
				{ name: "same-rarity", color: "gray" },
			]),
			"Related Set": Schema.richText(),
			"Related Color": Schema.richText(),
			"Related Card Type": Schema.richText(),
			"Related Rarity": Schema.richText(),
			"Related Cost": Schema.number(),
			"Related Power": Schema.number(),
			"Related Market Price": Schema.number("dollar"),
		},
	},
};
