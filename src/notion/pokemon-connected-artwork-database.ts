import * as Schema from "@notionhq/workers/schema";

export const POKEMON_CONNECTED_ARTWORK_DATABASE_KEY = "pokemonConnectedArtwork";

export const pokemonConnectedArtworkDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Pokémon · Connected Artwork",
	primaryKeyProperty: "Card ID" as const,
	schema: {
		properties: {
			"Card Name": Schema.title(),
			"Card ID": Schema.richText(),
			"Set Title": Schema.richText(),
			Series: Schema.richText(),
			"TCGdex Set ID": Schema.richText(),
			Position: Schema.number(),
			Image: Schema.url(),
			Owned: Schema.checkbox(),
			Notes: Schema.richText(),
		},
	},
};

export const POKEMON_CONNECTED_ARTWORK_SETS_DATABASE_KEY =
	"pokemonConnectedArtworkSets";

export const pokemonConnectedArtworkSetsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Pokémon · Connected Art Sets",
	primaryKeyProperty: "Set ID" as const,
	schema: {
		properties: {
			"Set Title": Schema.title(),
			"Set ID": Schema.richText(),
			Series: Schema.richText(),
			"TCGdex Set ID": Schema.richText(),
			"Total Cards": Schema.number(),
			Owned: Schema.number(),
			"Completion %": Schema.number("percent"),
			Complete: Schema.checkbox(),
			"Missing Card IDs": Schema.richText(),
		},
	},
};
