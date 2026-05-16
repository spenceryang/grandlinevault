import { Worker } from "@notionhq/workers";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";
import { j } from "@notionhq/workers/schema-builder";
import { config, requireEnv } from "./config.js";
import {
	findDuplicates,
	summarizeOwnedCards,
} from "./lib/collection.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";
import { createOwnedCardPage } from "./notion/write-owned-card.js";
import { fetchEnglishCatalogPage } from "./providers/catalog.js";
import { fetchPriceSnapshots } from "./providers/pricing.js";
import {
	classifyRecognition,
	recognizeCardFromImageUrl,
} from "./providers/recognition.js";

const worker = new Worker();
export default worker;

const cardCatalog = worker.database("cardCatalog", {
	type: "managed",
	initialTitle: "Grand Line Vault · Card Catalog",
	primaryKeyProperty: "Card ID",
	schema: {
		properties: {
			Name: Schema.title(),
			"Card ID": Schema.richText(),
			"Set Code": Schema.richText(),
			"Set Name": Schema.richText(),
			Variant: Schema.richText(),
			Rarity: Schema.richText(),
			Color: Schema.richText(),
			"Card Type": Schema.richText(),
			Cost: Schema.number(),
			Power: Schema.number(),
			Counter: Schema.number(),
			Effect: Schema.richText(),
			Image: Schema.file(),
			"Source URL": Schema.url(),
			English: Schema.checkbox(),
		},
	},
});

const priceSnapshots = worker.database("priceSnapshots", {
	type: "managed",
	initialTitle: "Grand Line Vault · Price Snapshots",
	primaryKeyProperty: "Snapshot ID",
	schema: {
		properties: {
			Name: Schema.title(),
			"Snapshot ID": Schema.richText(),
			"Card ID": Schema.richText(),
			"Market Price": Schema.number("dollar"),
			"Low Price": Schema.number("dollar"),
			Currency: Schema.richText(),
			Source: Schema.richText(),
			"Captured At": Schema.date(),
		},
	},
});

const externalApiPacer = worker.pacer("externalApis", {
	allowedRequests: 10,
	intervalMs: 1_000,
});

worker.sync("syncCardCatalog", {
	database: cardCatalog,
	mode: "replace",
	schedule: "manual",
	execute: async (state?: { page: number }) => {
		const feedUrl = requireEnv(config.catalogFeedUrl, "CATALOG_FEED_URL");
		const page = state?.page ?? 1;
		await externalApiPacer.wait();
		const { cards, hasMore } = await fetchEnglishCatalogPage(feedUrl, page);

		return {
			changes: cards.map((card) => ({
				type: "upsert" as const,
				key: card.cardId,
				properties: {
					Name: Builder.title(card.name),
					"Card ID": Builder.richText(card.cardId),
					"Set Code": Builder.richText(card.setCode),
					"Set Name": Builder.richText(card.setName),
					Variant: Builder.richText(card.variant),
					Rarity: Builder.richText(card.rarity),
					Color: Builder.richText(card.color),
					"Card Type": Builder.richText(card.cardType),
					Cost: Builder.number(card.cost ?? Number.NaN),
					Power: Builder.number(card.power ?? Number.NaN),
					Counter: Builder.number(card.counter ?? Number.NaN),
					Effect: Builder.richText(card.effectText ?? ""),
					Image: card.imageUrl ? Builder.file(card.imageUrl, card.name) : [],
					"Source URL": Builder.url(card.sourceUrl ?? ""),
					English: Builder.checkbox(true),
				},
				upstreamUpdatedAt: card.updatedAt,
				pageContentMarkdown: [
					`# ${card.name}`,
					`**Card ID:** ${card.cardId}`,
					`**Set:** ${card.setName} (${card.setCode})`,
					`**Variant:** ${card.variant}`,
					card.effectText ? `\n${card.effectText}` : "",
				].join("\n"),
			})),
			hasMore,
			nextState: hasMore ? { page: page + 1 } : undefined,
		};
	},
});

worker.sync("syncPriceSnapshots", {
	database: priceSnapshots,
	mode: "incremental",
	schedule: "1d",
	execute: async (state?: { page: number }) => {
		const feedUrl = requireEnv(config.priceFeedUrl, "PRICE_FEED_URL");
		const page = state?.page ?? 1;
		await externalApiPacer.wait();
		const { snapshots, hasMore } = await fetchPriceSnapshots(feedUrl, page);

		return {
			changes: snapshots.map((snapshot) => {
				const snapshotId = `${snapshot.cardId}:${snapshot.capturedAt}`;
				return {
					type: "upsert" as const,
					key: snapshotId,
					properties: {
						Name: Builder.title(`${snapshot.cardId} · ${snapshot.capturedAt}`),
						"Snapshot ID": Builder.richText(snapshotId),
						"Card ID": Builder.richText(snapshot.cardId),
						"Market Price": Builder.number(snapshot.marketPrice),
						"Low Price": Builder.number(snapshot.lowPrice ?? Number.NaN),
						Currency: Builder.richText(snapshot.currency),
						Source: Builder.richText(snapshot.source),
						"Captured At": Builder.date(snapshot.capturedAt.slice(0, 10)),
					},
				};
			}),
			hasMore,
			nextState: hasMore ? { page: page + 1 } : undefined,
		};
	},
});

worker.tool("identifyCard", {
	title: "Identify One Piece Card",
	description:
		"Recognize an uploaded One Piece card image and only auto-match English cards.",
	schema: j.object({
		imageUrl: j.string().describe("Publicly accessible image URL for the scan."),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ imageUrl }) => recognizeCardFromImageUrl(imageUrl),
});

worker.tool("classifyRecognitionCandidates", {
	title: "Classify Recognition Candidates",
	description:
		"Apply Grand Line Vault matching rules to already-recognized candidates.",
	schema: j.object({
		candidates: j.array(
			j.object({
				cardId: j.string(),
				name: j.string(),
				confidence: j.number(),
				language: j.enum("English", "Japanese", "Chinese", "Unknown"),
				imageUrl: j.string().nullable(),
			}),
		),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ candidates }) =>
		classifyRecognition(
			candidates.map((candidate) => ({
				cardId: candidate.cardId,
				name: candidate.name,
				confidence: candidate.confidence,
				language: candidate.language as
					| "English"
					| "Japanese"
					| "Chinese"
					| "Unknown",
				imageUrl: candidate.imageUrl ?? undefined,
			})),
		),
});

worker.tool("addOwnedCard", {
	title: "Add Owned Card",
	description:
		"Create an owned-card record in the user's collection database after recognition.",
	schema: j.object({
		ownerName: j.string(),
		cardId: j.string(),
		cardName: j.string(),
		quantity: j.number(),
		condition: j.string().nullable(),
		preGradeEstimate: j.string().nullable(),
		imageUrl: j.string().nullable(),
	}),
	execute: async (input, context) =>
		createOwnedCardPage(context.notion, {
			...input,
			imageUrl: input.imageUrl,
		}),
});

worker.tool("summarizeCollection", {
	title: "Summarize Collection",
	description:
		"Summarize total copies, unique cards, duplicates, and largest holdings for one owner.",
	schema: j.object({
		ownerName: j.string(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ ownerName }, context) => {
		const cards = await fetchOwnedCards(context.notion);
		return summarizeOwnedCards(ownerName, cards);
	},
});

worker.tool("listDuplicateCards", {
	title: "List Duplicate Cards",
	description: "List cards where one owner has more than one copy.",
	schema: j.object({
		ownerName: j.string(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ ownerName }, context) => {
		const cards = await fetchOwnedCards(context.notion);
		return {
			ownerName,
			duplicates: findDuplicates(ownerName, cards),
		};
	},
});
