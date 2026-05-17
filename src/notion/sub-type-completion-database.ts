import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const SUB_TYPE_COMPLETION_DATABASE_KEY = "subTypeCompletion";

export const subTypeCompletionDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Archetype Completion",
	primaryKeyProperty: "Sub Type" as const,
	schema: {
		databaseIcon: emojiIcon("🎯"),
		properties: {
			// Title doubles as pk — Straw Hat Crew / Whitebeard Pirates / etc.
			"Sub Type": Schema.title(),

			// Bar-renderable progress sits second. Toggle "Show as bar".
			"Completion %": Schema.number("percent"),

			// Counts immediately after the bar.
			Owned: Schema.number(),
			Total: Schema.number(),
			"Missing Count": Schema.number(),

			// Free-form list of missing card ids at the end — useful for
			// table-view scanning but visually heavy.
			"Missing Card IDs": Schema.richText(),
		},
	},
};
