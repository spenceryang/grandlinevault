import * as Schema from "@notionhq/workers/schema";

export const SUB_TYPE_COMPLETION_DATABASE_KEY = "subTypeCompletion";

export const subTypeCompletionDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Archetype Completion",
	primaryKeyProperty: "Sub Type" as const,
	schema: {
		properties: {
			"Sub Type": Schema.title(),
			Total: Schema.number(),
			Owned: Schema.number(),
			"Completion %": Schema.number("percent"),
			"Missing Count": Schema.number(),
			"Missing Card IDs": Schema.richText(),
		},
	},
};
