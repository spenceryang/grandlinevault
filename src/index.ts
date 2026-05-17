import { Worker } from "@notionhq/workers";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";
import { j } from "@notionhq/workers/schema-builder";
import { config, requireEnv } from "./config.js";
import {
	findDuplicates,
	summarizeOwnedCards,
} from "./lib/collection.js";
import {
	buildMasterSetEntries,
	summarizeMasterSetCompletion,
} from "./lib/master-set.js";
import {
	resolveBinderWidth,
	toCompactColorImageUrl,
} from "./lib/optcg-set-master-wall.js";
import {
	MASTER_SET_DATABASE_KEY,
	masterSetDatabaseConfig,
} from "./notion/master-set-database.js";
import { fetchOwnedCards } from "./notion/read-owned-cards.js";
import {
	processLatestScan,
	processScanInboxPage,
	whatDidIJustScan,
} from "./notion/process-scan-inbox.js";
import { createOwnedCardPage } from "./notion/write-owned-card.js";
import { listAllOptcgDonCards } from "./providers/optcgapi/don-cards.js";
import { filterOptcgCards } from "./providers/optcgapi/filter-cards.js";
import { resolveOptcgCardDetails } from "./providers/optcgapi/resolve-card.js";
import { getOptcgSet } from "./providers/optcgapi/get-set.js";
import {
	groupCardsBySet,
	listAllOptcgSetCards,
} from "./providers/optcgapi/list-all-set-cards.js";
import { listAllOptcgSets } from "./providers/optcgapi/list-all-sets.js";
import {
	filterOptcgPromoCards,
	getOptcgPromoCard,
} from "./providers/optcgapi/promos.js";
import {
	filterOptcgStarterCards,
	getOptcgStarterCard,
	getOptcgStarterDeck,
	listAllOptcgStarterCards,
	listAllOptcgStarterDecks,
} from "./providers/optcgapi/starter-decks.js";
import {
	SET_ANALYTICS_DATABASE_KEY,
	setAnalyticsDatabaseConfig,
} from "./notion/analytics-databases.js";
import { fetchEnglishCatalogPage } from "./providers/catalog.js";
import { fetchPriceSnapshots } from "./providers/pricing.js";
import {
	classifyRecognition,
	recognizeCardFromImageUrl,
} from "./providers/recognition.js";
import {
	extractSlackCardIntakeInput,
	postSlackResponse,
	processInlineCardImage,
	processSlackCardImage,
} from "./lib/slack-intake.js";

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

const masterSet = worker.database(
	MASTER_SET_DATABASE_KEY,
	masterSetDatabaseConfig,
);

const setAnalytics = worker.database(
	SET_ANALYTICS_DATABASE_KEY,
	setAnalyticsDatabaseConfig,
);

const externalApiPacer = worker.pacer("externalApis", {
	allowedRequests: 10,
	intervalMs: 1_000,
});

if (config.catalogFeedUrl) {
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
}

if (config.priceFeedUrl) {
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
}

worker.sync("syncOptcgCardCatalog", {
	database: cardCatalog,
	mode: "incremental",
	schedule: "manual",
	execute: async (state?: { setIndex: number }) => {
		const setIndex = state?.setIndex ?? 0;
		const setId = config.optcgSetIds[setIndex];
		if (!setId) {
			return { changes: [], hasMore: false };
		}

		await externalApiPacer.wait();
		const cards = await getOptcgSet(setId);

		return {
			changes: cards.map((card) => ({
				type: "upsert" as const,
				key: card.cardImageId,
				properties: {
					Name: Builder.title(card.name),
					"Card ID": Builder.richText(card.cardImageId),
					"Set Code": Builder.richText(card.setId ?? setId),
					"Set Name": Builder.richText(card.setName ?? ""),
					Variant: Builder.richText(
						card.cardImageId === card.cardSetId
							? "Standard"
							: card.cardImageId.replace(card.cardSetId, "") || "Variant",
					),
					Rarity: Builder.richText(card.rarity ?? ""),
					Color: Builder.richText(card.color ?? ""),
					"Card Type": Builder.richText(card.cardType ?? ""),
					Cost: Builder.number(card.cost ?? Number.NaN),
					Power: Builder.number(card.power ?? Number.NaN),
					Counter: Builder.number(card.counter ?? Number.NaN),
					Effect: Builder.richText(card.text ?? ""),
					Image: Builder.file(card.imageUrl, card.name),
					"Source URL": Builder.url(
						`https://optcgapi.com/api/sets/card/${card.cardSetId}/`,
					),
					English: Builder.checkbox(true),
				},
				upstreamUpdatedAt: card.dateScraped,
				pageContentMarkdown: [
					`# ${card.name}`,
					`**Card ID:** ${card.cardImageId}`,
					`**Base ID:** ${card.cardSetId}`,
					`**Set:** ${card.setName ?? ""} (${card.setId ?? setId})`,
					`**Rarity:** ${card.rarity ?? ""}`,
					`**Market price:** ${formatUsd(card.marketPrice)}`,
					card.text ? `\n${card.text}` : "",
				].join("\n"),
			})),
			hasMore: setIndex < config.optcgSetIds.length - 1,
			nextState:
				setIndex < config.optcgSetIds.length - 1
					? { setIndex: setIndex + 1 }
					: undefined,
		};
	},
});

worker.sync("syncOptcgPriceSnapshots", {
	database: priceSnapshots,
	mode: "incremental",
	schedule: "1d",
	execute: async (state?: { setIndex: number }) => {
		const setIndex = state?.setIndex ?? 0;
		const setId = config.optcgSetIds[setIndex];
		if (!setId) {
			return { changes: [], hasMore: false };
		}

		await externalApiPacer.wait();
		const cards = await getOptcgSet(setId);
		const capturedAt = new Date().toISOString();

		return {
			changes: cards
				.filter((card) => typeof card.marketPrice === "number")
				.map((card) => {
					const snapshotId = `${card.cardImageId}:${capturedAt}`;
					return {
						type: "upsert" as const,
						key: snapshotId,
						properties: {
							Name: Builder.title(`${card.cardImageId} · ${capturedAt}`),
							"Snapshot ID": Builder.richText(snapshotId),
							"Card ID": Builder.richText(card.cardImageId),
							"Market Price": Builder.number(card.marketPrice ?? Number.NaN),
							"Low Price": Builder.number(
								card.inventoryPrice ?? card.marketPrice ?? Number.NaN,
							),
							Currency: Builder.richText("USD"),
							Source: Builder.richText("OPTCG API"),
							"Captured At": Builder.date(capturedAt.slice(0, 10)),
						},
					};
				}),
			hasMore: setIndex < config.optcgSetIds.length - 1,
			nextState:
				setIndex < config.optcgSetIds.length - 1
					? { setIndex: setIndex + 1 }
					: undefined,
		};
	},
});

worker.sync("syncOptcgMasterSet", {
	database: masterSet,
	mode: "incremental",
	schedule: "manual",
	execute: async (state?: { setIndex: number }) => {
		const setIndex = state?.setIndex ?? 0;
		const setId = config.optcgSetIds[setIndex];
		if (!setId) {
			return { changes: [], hasMore: false };
		}

		// Route card art through the wsrv.nl proxy at a width controlled by
		// the BINDER_DENSITY env var. Default = Medium (360px) so the
		// gallery card flows ~3-4 cards per row at typical Notion widths.
		const binderWidth = resolveBinderWidth(process.env.BINDER_DENSITY);

		await externalApiPacer.wait();
		const cards = await getOptcgSet(setId);
		const entries = buildMasterSetEntries(
			cards.map((card) => ({
				card_set_id: card.cardSetId,
				card_image_id: card.cardImageId,
				card_name: card.name,
				set_id: card.setId,
				set_name: card.setName,
				rarity: card.rarity,
				card_color: card.color,
				card_type: card.cardType,
				card_image: card.imageUrl,
			})),
		);

		return {
			changes: entries.map((entry) => ({
				type: "upsert" as const,
				key: entry.variantId,
				properties: {
					Name: Builder.title(entry.name),
					"Variant ID": Builder.richText(entry.variantId),
					"Base Card ID": Builder.richText(entry.baseCardId),
					"Set ID": Builder.richText(entry.setId ?? setId),
					"Set Name": Builder.richText(entry.setName ?? ""),
					Variant: Builder.select(entry.variant),
					Rarity: Builder.richText(entry.rarity ?? ""),
					Color: Builder.richText(entry.color ?? ""),
					"Card Type": Builder.richText(entry.cardType ?? ""),
					Image: Builder.file(
						toCompactColorImageUrl(entry.imageUrl, binderWidth),
						entry.name,
					),
					Owned: Builder.checkbox(false),
				},
			})),
			hasMore: setIndex < config.optcgSetIds.length - 1,
			nextState:
				setIndex < config.optcgSetIds.length - 1
					? { setIndex: setIndex + 1 }
					: undefined,
		};
	},
});

worker.sync("syncOptcgSetAnalytics", {
	database: setAnalytics,
	mode: "replace",
	schedule: "1d",
	execute: async (_state, context) => {
		await externalApiPacer.wait();
		const cards = await listAllOptcgSetCards();
		const grouped = groupCardsBySet(cards);

		let ownedIds = new Set<string>();
		try {
			const owned = await fetchOwnedCards(context.notion);
			ownedIds = new Set(owned.map((c) => c.cardId.trim().toUpperCase()));
		} catch (error) {
			console.warn(
				"syncOptcgSetAnalytics: owned-cards data source unavailable; writing 0% completion.",
				error,
			);
		}

		return {
			changes: Array.from(grouped.entries()).map(([setId, setCards]) => {
				const total = setCards.length;
				const base = setCards.filter((c) => c.cardImageId === c.cardSetId);
				const parallels = setCards.filter(
					(c) => c.cardImageId !== c.cardSetId,
				);
				const isOwned = (variantId: string, baseId: string) =>
					ownedIds.has(variantId.toUpperCase()) ||
					ownedIds.has(baseId.toUpperCase());
				const ownedCards = setCards.filter((c) =>
					isOwned(c.cardImageId, c.cardSetId),
				);
				const ownedBase = base.filter((c) =>
					isOwned(c.cardImageId, c.cardSetId),
				);
				const ownedParallels = parallels.filter((c) =>
					isOwned(c.cardImageId, c.cardSetId),
				);
				const totalValue = setCards.reduce(
					(sum, c) => sum + (c.marketPrice ?? 0),
					0,
				);
				const ownedValue = ownedCards.reduce(
					(sum, c) => sum + (c.marketPrice ?? 0),
					0,
				);
				return {
					type: "upsert" as const,
					key: setId,
					properties: {
						"Set Name": Builder.title(setCards[0].setName ?? setId),
						"Set ID": Builder.richText(setId),
						"Total Cards": Builder.number(total),
						Owned: Builder.number(ownedCards.length),
						"Completion %": Builder.number(
							total === 0 ? 0 : ownedCards.length / total,
						),
						"Base Owned": Builder.number(ownedBase.length),
						"Base Total": Builder.number(base.length),
						"Parallel Owned": Builder.number(ownedParallels.length),
						"Parallel Total": Builder.number(parallels.length),
						"Total Value": Builder.number(
							Math.round(totalValue * 100) / 100,
						),
						"Owned Value": Builder.number(
							Math.round(ownedValue * 100) / 100,
						),
					},
				};
			}),
			hasMore: false,
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

if (process.env.ENABLE_NOTION_AUTOMATIONS === "1") {
	worker.automation("processScanInboxUpload", {
		title: "Process Scan Inbox Upload",
		description:
			"Runs when a Scan Inbox row gets a Front image upload, recognizes the English One Piece card, enriches it, creates an owned-card record, and writes the result back to the row.",
		execute: async (event, context) => {
			if (!event.pageData) {
				throw new Error("This automation must be triggered from a Notion page.");
			}

			await processScanInboxPage(context.notion, event.pageData);
		},
	});
}

worker.tool("processScanInboxPage", {
	title: "Process Scan Inbox Page",
	description:
		"Manually process one Scan Inbox page by page ID. Use this as a fallback when testing the upload automation.",
	schema: j.object({
		pageId: j.string(),
	}),
	execute: async ({ pageId }, context) => {
		const page = await context.notion.pages.retrieve({ page_id: pageId });
		if (!("properties" in page)) {
			throw new Error("The provided page ID is not a database page.");
		}
		return processScanInboxPage(context.notion, page);
	},
});

worker.tool("processSlackCardImage", {
	title: "Process Slack Card Image",
	description:
		"Take a card image URL from Slack, add it to Scan Inbox, recognize/enrich the English One Piece card, and create the owned-card row.",
	schema: j.object({
		imageUrl: j.string().describe("Slack file URL or public image URL."),
		ownerName: j.string().nullable().describe("Optional explicit owner name, e.g. Spencer, Jarren, or Waffle."),
		slackUserId: j.string().nullable().describe("Slack user ID used with SLACK_OWNER_MAP when ownerName is omitted."),
		filename: j.string().nullable().describe("Original Slack filename."),
	}),
	execute: async ({ imageUrl, ownerName, slackUserId, filename }, context) => {
		return processSlackCardImage(context.notion, {
			imageUrl,
			ownerName,
			slackUserId,
			filename,
		});
	},
});

worker.tool("processInlineCardImage", {
	title: "Process Inline Card Image",
	description:
		"Take a base64 image payload, add it to Scan Inbox, recognize/enrich the English One Piece card, and create the owned-card row. Use this when Slack or local image URLs are private.",
	schema: j.object({
		imageBase64: j.string().describe("Base64-encoded image bytes, with or without a data: URL prefix."),
		ownerName: j.string().nullable().describe("Optional explicit owner name, e.g. Spencer, Jarren, or Waffle."),
		filename: j.string().nullable().describe("Original filename."),
		contentType: j.string().nullable().describe("Image MIME type, e.g. image/jpeg."),
	}),
	execute: async ({ imageBase64, ownerName, filename, contentType }, context) => {
		return processInlineCardImage(context.notion, {
			imageBase64,
			ownerName,
			filename,
			contentType,
		});
	},
});

worker.webhook("slackCardIntake", {
	title: "Slack Card Intake",
	description:
		"Receives a Slack image payload or relay payload, adds it to Scan Inbox, processes the card, and optionally posts back to Slack response_url.",
	execute: async (events, context) => {
		for (const event of events) {
			const body = event.body;
			if (body.type === "url_verification") {
				console.log("Slack URL verification received. Use a tiny Slack relay for direct Slack Events API verification; this Worker webhook intentionally returns the standard Notion webhook success body.");
				continue;
			}

			const input = extractSlackCardIntakeInput(body);
			if (!input) {
				console.log("Slack card intake skipped: no image URL in payload.");
				continue;
			}

			const result = await processSlackCardImage(context.notion, input);
			const responseUrl = typeof body.response_url === "string" ? body.response_url : undefined;
			if (responseUrl) {
				await postSlackResponse(responseUrl, result.slackReply);
			}
		}
	},
});

worker.tool("handleNewScan", {
	title: "Handle New Scan",
	description:
		"Primary agent command for 'handle new scan'. Process exactly one most-recent Scan Inbox row with Status = New, create the owned-card record when matched, update the Scan Inbox result, then stop. Do not call Batch Process Scan Inbox Queue after this tool.",
	schema: j.object({
		name: j.string().nullable().describe("Optional agent-provided command name. Ignored by the worker."),
	}),
	execute: async (_input, context) => {
		const result = await processLatestScan(context.notion);
		return {
			...result,
			agentInstruction:
				"Stop after this tool call. Do not call any other scan-processing tool. Report this result to the user as the final scan outcome.",
		};
	},
});

worker.tool("whatDidIJustScan", {
	title: "What Did I Just Scan?",
	description:
		"Return the latest matched Scan Inbox result with status, recognition summary, confidence, and linked owned-card URL.",
	schema: j.object({}),
	hints: { readOnlyHint: true },
	execute: async (_input, context) => {
		return whatDidIJustScan(context.notion);
	},
});

worker.tool("identifyAndEnrichCard", {
	title: "Identify and Enrich One Piece Card",
	description:
		"Recognize an uploaded English card image, then fetch canonical OPTCG details and price data for the matched card.",
	schema: j.object({
		imageUrl: j.string().describe("Publicly accessible image URL for the scan."),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ imageUrl }) => {
		const recognition = await recognizeCardFromImageUrl(imageUrl);
		if (recognition.status !== "matched") {
			return { recognition, variants: [] };
		}

		const variants = await resolveOptcgCardDetails(recognition.candidate.cardId);
		return { recognition, variants };
	},
});

worker.tool("getCardDetails", {
	title: "Get Card Details",
	description:
		"Fetch canonical OPTCG details, variants, images, and market prices for a card ID like OP05-119.",
	schema: j.object({
		cardId: j.string(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ cardId }) => {
		return { cardId, variants: await resolveOptcgCardDetails(cardId) };
	},
});

worker.tool("getSetCards", {
	title: "Get Set Cards",
	description:
		"Fetch cards from an OPTCG set like OP-05, including rarity, color, type, images, and market prices.",
	schema: j.object({
		setId: j.string(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ setId }) => {
		return { setId, cards: await getOptcgSet(setId) };
	},
});

worker.tool("filterCatalogCards", {
	title: "Filter Catalog Cards",
	description:
		"Search OPTCG cards by name, color, type, cost, and rarity. Use this for queries like 'all SR Red Zoros' or 'red leaders'. cardName is a server-side substring match.",
	schema: j.object({
		cardName: j.string().nullable(),
		color: j.string().nullable(),
		cardType: j.string().nullable(),
		cost: j.string().nullable(),
		rarity: j.string().nullable(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ cardName, color, cardType, cost, rarity }) => {
		return {
			cards: await filterOptcgCards({
				cardName: cardName ?? undefined,
				color: color ?? undefined,
				cardType: cardType ?? undefined,
				cost: cost ?? undefined,
				rarity: rarity ?? undefined,
			}),
		};
	},
});

worker.tool("listAllSets", {
	title: "List All Sets",
	description: "List all available One Piece TCG sets from OPTCG API.",
	schema: j.object({}),
	hints: { readOnlyHint: true },
	execute: async () => {
		return { sets: await listAllOptcgSets() };
	},
});

worker.tool("summarizeMasterSet", {
	title: "Summarize Master Set Completion",
	description:
		"Summarize base and parallel completion for a set from OPTCG API using owned card IDs.",
	schema: j.object({
		setId: j.string(),
		ownedCardIds: j.array(j.string()),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ setId, ownedCardIds }) => {
		const cards = await getOptcgSet(setId);
		const owned = new Set(ownedCardIds.map((id) => id.trim().toUpperCase()));
		const entries = buildMasterSetEntries(
			cards.map((card) => ({
				card_set_id: card.cardSetId,
				card_image_id: card.cardImageId,
				card_name: card.name,
				set_id: card.setId,
				set_name: card.setName,
				rarity: card.rarity,
				card_color: card.color,
				card_type: card.cardType,
				card_image: card.imageUrl,
			})),
		).map((entry) => ({
			...entry,
			owned: owned.has(entry.variantId.toUpperCase()) ||
				owned.has(entry.baseCardId.toUpperCase()),
		}));

		return {
			setId,
			summary: summarizeMasterSetCompletion(entries),
			entries,
		};
	},
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
		setCode: j.string().nullable(),
		setName: j.string().nullable(),
		rarity: j.string().nullable(),
		color: j.string().nullable(),
		cardType: j.string().nullable(),
		marketPrice: j.number().nullable(),
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

function formatUsd(value: number | null): string {
	return typeof value === "number" ? `$${value.toFixed(2)}` : "Unknown";
}

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

worker.tool("listStarterDecks", {
	title: "List Starter Decks",
	description:
		"List every published One Piece TCG starter deck (e.g. ST-01 'Straw Hat Crew').",
	schema: j.object({}),
	hints: { readOnlyHint: true },
	execute: async () => {
		return { decks: await listAllOptcgStarterDecks() };
	},
});

worker.tool("getStarterDeckCards", {
	title: "Get Starter Deck Cards",
	description:
		"Fetch the contents of a starter deck by id (e.g. ST-01) — Leader plus the bundled cards.",
	schema: j.object({
		structureDeckId: j.string(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ structureDeckId }) => {
		return {
			structureDeckId,
			cards: await getOptcgStarterDeck(structureDeckId),
		};
	},
});

worker.tool("getStarterCardDetails", {
	title: "Get Starter Card Details",
	description:
		"Fetch variants, image, and pricing for a single starter-deck card id (e.g. ST01-001).",
	schema: j.object({
		cardSetId: j.string(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ cardSetId }) => {
		return {
			cardSetId,
			variants: await getOptcgStarterCard(cardSetId),
		};
	},
});

worker.tool("filterStarterCards", {
	title: "Filter Starter Deck Cards",
	description:
		"Filter starter-deck cards by name, color, type, cost, or rarity. Provide at least one filter. cardName is a server-side substring match.",
	schema: j.object({
		cardName: j.string().nullable(),
		color: j.string().nullable(),
		cardType: j.string().nullable(),
		cost: j.string().nullable(),
		rarity: j.string().nullable(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ cardName, color, cardType, cost, rarity }) => {
		return {
			cards: await filterOptcgStarterCards({
				cardName: cardName ?? undefined,
				color: color ?? undefined,
				cardType: cardType ?? undefined,
				cost: cost ?? undefined,
				rarity: rarity ?? undefined,
			}),
		};
	},
});

worker.tool("listAllStarterCards", {
	title: "List All Starter Cards",
	description:
		"Bulk endpoint — every card across every starter deck in a single call.",
	schema: j.object({}),
	hints: { readOnlyHint: true },
	execute: async () => {
		return { cards: await listAllOptcgStarterCards() };
	},
});

worker.tool("getPromoCardDetails", {
	title: "Get Promo Card Details",
	description:
		"Fetch variants, image, and pricing for a One Piece TCG promo card by id (e.g. P-001).",
	schema: j.object({
		cardSetId: j.string(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ cardSetId }) => {
		return {
			cardSetId,
			variants: await getOptcgPromoCard(cardSetId),
		};
	},
});

worker.tool("filterPromoCards", {
	title: "Filter Promo Cards",
	description:
		"Filter One Piece TCG promo cards by name, color, type, cost, or rarity. Provide at least one filter. cardName is a server-side substring match.",
	schema: j.object({
		cardName: j.string().nullable(),
		color: j.string().nullable(),
		cardType: j.string().nullable(),
		cost: j.string().nullable(),
		rarity: j.string().nullable(),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ cardName, color, cardType, cost, rarity }) => {
		return {
			cards: await filterOptcgPromoCards({
				cardName: cardName ?? undefined,
				color: color ?? undefined,
				cardType: cardType ?? undefined,
				cost: cost ?? undefined,
				rarity: rarity ?? undefined,
			}),
		};
	},
});

worker.tool("listDonCards", {
	title: "List DON!! Cards",
	description:
		"List every DON!! resource card in the One Piece TCG catalog with rarity, art, and pricing.",
	schema: j.object({}),
	hints: { readOnlyHint: true },
	execute: async () => {
		return { cards: await listAllOptcgDonCards() };
	},
});
