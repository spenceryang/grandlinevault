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
			// Title + pk anchor every view.
			"Card Name": Schema.title(),
			"Relation ID": Schema.richText(),

			// The headline metric — the score is what "related" means.
			Score: Schema.number(),

			// Why this card was recommended. Multi-select with colored
			// chips so the reasons are eye-catching at a glance.
			Reasons: Schema.multiSelect([
				{ name: "same-character", color: "yellow" },
				{ name: "same-set", color: "blue" },
				{ name: "same-color", color: "red" },
				{ name: "same-type", color: "purple" },
				{ name: "shared-sub-types", color: "green" },
				{ name: "cost-curve", color: "orange" },
				{ name: "same-rarity", color: "gray" },
			]),

			// Image as `file` so gallery views can use it as the card
			// cover. The "recommendation wall" view rides on this.
			"Related Card Image": Schema.file(),

			// The recommended card's details.
			"Related Market Price": Schema.number("dollar"),
			"Related Rarity": Schema.richText(),
			"Related Color": Schema.richText(),
			"Related Card Type": Schema.richText(),
			"Related Cost": Schema.number(),
			"Related Power": Schema.number(),
			"Related Set": Schema.richText(),

			// Source card (the "given" half of the relation) + the
			// related card id sit at the end — they're identifier
			// columns more than insight columns.
			"Source Card Name": Schema.richText(),
			"Source Card ID": Schema.richText(),
			"Related Card ID": Schema.richText(),
		},
	},
};
