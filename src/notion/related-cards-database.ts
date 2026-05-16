import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

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
