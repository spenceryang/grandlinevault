import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import { config, requireEnv } from "./config.js";
import {
	buildBattleDeck,
	simulateBattle,
	type BattleDeckStrategy,
	type BattleOwnedCard,
} from "./lib/op-battle.js";
import {
	BATTLE_DECKS_DATABASE_KEY,
	BATTLE_RUNS_DATABASE_KEY,
	battleDecksDatabaseConfig,
	battleRunsDatabaseConfig,
} from "./notion/op-battle-databases.js";
import { fetchBattleOwnedCards } from "./notion/read-battle-owned-cards.js";
import {
	createBattleDeckPage,
	createBattleRunPage,
} from "./notion/write-op-battle.js";
import { resolveOptcgCardDetails } from "./providers/optcgapi/resolve-card.js";

const worker = new Worker();
export default worker;

worker.database(BATTLE_DECKS_DATABASE_KEY, battleDecksDatabaseConfig);
worker.database(BATTLE_RUNS_DATABASE_KEY, battleRunsDatabaseConfig);

const optcgPacer = worker.pacer("optcgBattleApi", {
	allowedRequests: 8,
	intervalMs: 1_000,
});

worker.tool("buildBattleDeck", {
	title: "Build OP Battle Deck",
	description:
		"Auto-build and permanently save the strongest legal-ish One Piece battle deck from an owner's current Grand Line Vault collection.",
	schema: j.object({
		ownerName: j.string().describe("Collection owner, e.g. Spencer, Jarren, or waffle."),
		strategy: j
			.enum("strongest", "balanced", "straw-hat", "worst-generation", "animal-kingdom")
			.nullable()
			.describe("Optional deck-building strategy. Defaults to strongest."),
	}),
	execute: async ({ ownerName, strategy }, context) => {
		const owned = await loadEnrichedOwnedCards(context.notion);
		const deck = buildBattleDeck(ownerName, owned, {
			strategy: (strategy ?? "strongest") as BattleDeckStrategy,
		});
		const page = await createBattleDeckPage(context.notion, deck);
		return {
			deck,
			page,
			agentSummary: `${ownerName}'s ${deck.leader.cardName} deck was saved permanently with ${deck.mainDeck.length} main-deck cards and estimated strength ${deck.estimatedStrength}.`,
		};
	},
});

worker.tool("simulateBattle", {
	title: "Simulate OP Battle",
	description:
		"Build permanent battle decks for two owners, run a Monte Carlo battle simulation, and save the compact battle history to Notion.",
	schema: j.object({
		playerA: j.string().describe("First owner, e.g. Spencer."),
		playerB: j.string().describe("Second owner, e.g. Jarren or waffle."),
		runs: j.number().nullable().describe("Monte Carlo run count. Defaults to 100."),
		strategyA: j
			.enum("strongest", "balanced", "straw-hat", "worst-generation", "animal-kingdom")
			.nullable(),
		strategyB: j
			.enum("strongest", "balanced", "straw-hat", "worst-generation", "animal-kingdom")
			.nullable(),
	}),
	execute: async ({ playerA, playerB, runs, strategyA, strategyB }, context) => {
		const owned = await loadEnrichedOwnedCards(context.notion);
		const deckA = buildBattleDeck(playerA, owned, {
			strategy: (strategyA ?? "strongest") as BattleDeckStrategy,
		});
		const deckB = buildBattleDeck(playerB, owned, {
			strategy: (strategyB ?? "strongest") as BattleDeckStrategy,
		});
		const deckAPage = await createBattleDeckPage(context.notion, deckA);
		const deckBPage = await createBattleDeckPage(context.notion, deckB);
		const result = simulateBattle(deckA, deckB, {
			runs: runs ?? 100,
		});
		const runPage = await createBattleRunPage(
			context.notion,
			result,
			deckAPage.url,
			deckBPage.url,
		);
		return {
			result,
			pages: {
				deckA: deckAPage,
				deckB: deckBPage,
				battleRun: runPage,
			},
			agentSummary: `${result.playerA} vs ${result.playerB}: ${result.winner} wins the ${result.simulations}-battle simulation (${(Math.max(result.aWinRate, result.bWinRate) * 100).toFixed(1)}% top win rate).`,
		};
	},
});

worker.tool("archiveBattleRuns", {
	title: "Archive OP Battle Runs",
	description:
		"Mark older Battle Run pages as Archived so the Notion battle history stays compact.",
	schema: j.object({
		keepLatest: j.number().describe("Number of newest battle runs to keep Active."),
	}),
	execute: async ({ keepLatest }, context) => {
		const dataSourceId = requireEnv(
			config.battleRunsDataSourceId,
			"BATTLE_RUNS_DATA_SOURCE_ID",
		);
		const pages = [];
		let cursor: string | undefined;
		do {
			const response = await context.notion.dataSources.query({
				data_source_id: dataSourceId,
				start_cursor: cursor,
				page_size: 100,
			});
			pages.push(...response.results.filter((page) => "properties" in page));
			cursor = response.next_cursor ?? undefined;
		} while (cursor);

		const sorted = pages.sort((a, b) => {
			const aTime = "created_time" in a ? Date.parse(a.created_time) : 0;
			const bTime = "created_time" in b ? Date.parse(b.created_time) : 0;
			return bTime - aTime;
		});
		const archive = sorted.slice(Math.max(0, keepLatest));
		for (const page of archive) {
			await context.notion.pages.update({
				page_id: page.id,
				properties: { Status: { status: { name: "Done" } } },
			});
		}
		return {
			keptActive: Math.min(keepLatest, sorted.length),
			archived: archive.length,
		};
	},
});

async function loadEnrichedOwnedCards(notion: Parameters<typeof fetchBattleOwnedCards>[0]) {
	const owned = await fetchBattleOwnedCards(notion);
	const cache = new Map<string, Partial<BattleOwnedCard>>();

	for (const cardId of new Set(owned.map((card) => card.cardId.toUpperCase()))) {
		try {
			await optcgPacer.wait();
			const variants = await resolveOptcgCardDetails(cardId);
			const exact =
				variants.find((variant) => variant.cardImageId.toUpperCase() === cardId) ??
				variants.find((variant) => variant.cardSetId.toUpperCase() === cardId) ??
				variants[0];
			if (exact) {
				cache.set(cardId, {
					cardName: exact.name,
					cardType: exact.cardType,
					color: exact.color,
					cost: exact.cost,
					power: exact.power,
					counter: exact.counter,
					rarity: exact.rarity,
					marketPrice: exact.marketPrice,
					setCode: exact.setId,
					imageUrl: exact.imageUrl,
				});
			}
		} catch {
			// Keep the locally stored Notion metadata if the external API misses.
		}
	}

	return owned.map((card) => ({
		...card,
		...(cache.get(card.cardId.toUpperCase()) ?? {}),
		ownerName: card.ownerName,
		cardId: card.cardId,
		quantity: card.quantity,
	}));
}
