import * as Schema from "@notionhq/workers/schema";

export const OPTCG_SET_MASTER_WALL_DATABASE_KEY = "optcgSetMasterWall";

export const optcgSetMasterWallDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "One Piece · Set Master Wall",
	primaryKeyProperty: "Card ID" as const,
	schema: {
		properties: {
			"Card Name": Schema.title(),
			"Card ID": Schema.richText(),
			"Set ID": Schema.richText(),
			"Set Name": Schema.richText(),
			"Base Card ID": Schema.richText(),
			Rarity: Schema.richText(),
			Color: Schema.richText(),
			"Card Type": Schema.richText(),
			"Owned Image": Schema.file(),
			"Need Image": Schema.file(),
			Owned: Schema.checkbox(),
		},
	},
};

export const OPTCG_SET_MASTER_WALL_SUMMARY_DATABASE_KEY =
	"optcgSetMasterWallSummary";

export const optcgSetMasterWallSummaryDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "One Piece · Set Master Wall Summary",
	primaryKeyProperty: "Set ID" as const,
	schema: {
		properties: {
			"Set Name": Schema.title(),
			"Set ID": Schema.richText(),
			"Total Cards": Schema.number(),
			Owned: Schema.number(),
			"Completion %": Schema.number("percent"),
			Missing: Schema.number(),
		},
	},
};
