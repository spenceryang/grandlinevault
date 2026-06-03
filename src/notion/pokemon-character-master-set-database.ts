import * as Schema from "@notionhq/workers/schema";

export const POKEMON_CHARACTER_MASTER_SET_DATABASE_KEY =
	"pokemonCharacterMasterSet";

export const pokemonCharacterMasterSetDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Pokémon · Character Master Sets",
	primaryKeyProperty: "Card ID" as const,
	schema: {
		properties: {
			"Card Name": Schema.title(),
			"Card ID": Schema.richText(),
			Character: Schema.select([
				{ name: "Charizard", color: "red" },
				{ name: "Gengar", color: "purple" },
				{ name: "Pikachu", color: "yellow" },
				{ name: "Togekiss", color: "pink" },
			]),
			"Set ID": Schema.richText(),
			"Local ID": Schema.richText(),
			"Owned Image": Schema.file(),
			"Need Image": Schema.file(),
			Owned: Schema.checkbox(),
		},
	},
};

export const POKEMON_CHARACTER_MASTER_SET_SUMMARY_DATABASE_KEY =
	"pokemonCharacterMasterSetSummary";

export const pokemonCharacterMasterSetSummaryDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "Pokémon · Character Master Set Summary",
	primaryKeyProperty: "Character" as const,
	schema: {
		properties: {
			Character: Schema.title(),
			"Total Cards": Schema.number(),
			Owned: Schema.number(),
			"Completion %": Schema.number("percent"),
			Missing: Schema.number(),
		},
	},
};
