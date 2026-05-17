import * as Schema from "@notionhq/workers/schema";
import { emojiIcon } from "@notionhq/workers/builder";

export const MASTER_SET_DATABASE_KEY = "masterSet";

export const masterSetDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Master Set",
	primaryKeyProperty: "Variant ID" as const,
	schema: {
		databaseIcon: emojiIcon("🗺️"),
		properties: {
			// Title + identity come first so they anchor every view.
			Name: Schema.title(),
			"Variant ID": Schema.richText(),

			// Primary action + visual chip rank above everything else so
			// the user sees them without scrolling the table view.
			Owned: Schema.checkbox(),
			Variant: Schema.select([
				{ name: "base", color: "default" },
				{ name: "parallel", color: "blue" },
				{ name: "alt-art", color: "purple" },
				{ name: "promo", color: "orange" },
			]),

			// The visual itself — file-typed so it renders as the gallery
			// card cover when the view's card preview is set to Image.
			Image: Schema.file(),

			// Where the card lives — Set Name first because it's the
			// human-readable label most collectors recognize.
			"Set Name": Schema.richText(),
			Rarity: Schema.richText(),
			Color: Schema.richText(),
			"Card Type": Schema.richText(),

			// Grouping + machine identifiers sit at the end of the table
			// so the eye-catching columns above stay visible by default.
			"Base Card ID": Schema.richText(),
			"Set ID": Schema.richText(),
		},
	},
};
