import { emojiIcon } from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";

export const BATTLE_DECKS_DATABASE_KEY = "opBattleDecks";

export const battleDecksDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "OP Battle · Battle Decks",
	primaryKeyProperty: "Deck ID" as const,
	schema: {
		databaseIcon: emojiIcon("⚔️"),
		properties: {
			Name: Schema.title(),
			"Deck ID": Schema.richText(),
			Owner: Schema.richText(),
			Status: Schema.status({
				groups: [
					{
						name: "In progress",
						options: [{ name: "Active", color: "green" }],
					},
					{
						name: "Complete",
						options: [{ name: "Archived", color: "gray" }],
					},
				],
			}),
			Strategy: Schema.select([
				{ name: "strongest", color: "red" },
				{ name: "balanced", color: "blue" },
				{ name: "straw-hat", color: "red" },
				{ name: "worst-generation", color: "green" },
				{ name: "animal-kingdom", color: "purple" },
			]),
			"Leader Name": Schema.richText(),
			"Leader Card ID": Schema.richText(),
			Colors: Schema.richText(),
			"Main Deck Count": Schema.number(),
			"Estimated Strength": Schema.number(),
			"Model Version": Schema.richText(),
			"Created At": Schema.date(),
		},
	},
};

export const BATTLE_RUNS_DATABASE_KEY = "opBattleRuns";

export const battleRunsDatabaseConfig = {
	type: "managed" as const,
	initialTitle: "OP Battle · Battle Runs",
	primaryKeyProperty: "Run ID" as const,
	schema: {
		databaseIcon: emojiIcon("🎲"),
		properties: {
			Name: Schema.title(),
			"Run ID": Schema.richText(),
			Status: Schema.status({
				groups: [
					{
						name: "In progress",
						options: [{ name: "Active", color: "green" }],
					},
					{
						name: "Complete",
						options: [{ name: "Archived", color: "gray" }],
					},
				],
			}),
			Winner: Schema.richText(),
			"Player A": Schema.richText(),
			"Player B": Schema.richText(),
			"Deck A ID": Schema.richText(),
			"Deck B ID": Schema.richText(),
			Simulations: Schema.number(),
			"A Wins": Schema.number(),
			"B Wins": Schema.number(),
			Draws: Schema.number(),
			"A Win Rate": Schema.number("percent"),
			"B Win Rate": Schema.number("percent"),
			"Model Version": Schema.richText(),
			"Created At": Schema.date(),
		},
	},
};
