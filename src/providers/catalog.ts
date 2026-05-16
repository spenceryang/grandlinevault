import { inferSetCode, normalizeCardId } from "../lib/card-id.js";
import type { EnglishCard } from "../types.js";

type RawCatalogRecord = {
	cardId?: string;
	id?: string;
	name?: string;
	setCode?: string;
	setName?: string;
	variant?: string;
	rarity?: string;
	color?: EnglishCard["color"];
	cardType?: EnglishCard["cardType"];
	type?: EnglishCard["cardType"];
	cost?: number;
	power?: number;
	counter?: number;
	effectText?: string;
	effect?: string;
	imageUrl?: string;
	image?: string;
	sourceUrl?: string;
	language?: string;
	updatedAt?: string;
};

export async function fetchEnglishCatalogPage(
	feedUrl: string,
	page: number,
): Promise<{ cards: EnglishCard[]; hasMore: boolean }> {
	const url = new URL(feedUrl);
	url.searchParams.set("page", String(page));

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Catalog feed request failed with ${response.status}.`);
	}

	const payload = (await response.json()) as {
		data?: RawCatalogRecord[];
		cards?: RawCatalogRecord[];
		hasMore?: boolean;
		current_page?: number;
		last_page?: number;
	};

	const rows = payload.data ?? payload.cards ?? [];
	const cards = rows
		.map(normalizeCatalogRecord)
		.filter((card): card is EnglishCard => Boolean(card));

	const hasMore =
		payload.hasMore ??
		(payload.current_page !== undefined &&
			payload.last_page !== undefined &&
			payload.current_page < payload.last_page);

	return { cards, hasMore: Boolean(hasMore) };
}

export function normalizeCatalogRecord(
	record: RawCatalogRecord,
): EnglishCard | null {
	const rawId = record.cardId ?? record.id;
	if (!rawId || !record.name) {
		return null;
	}

	if (
		record.language &&
		record.language.toLowerCase() !== "english" &&
		record.language.toLowerCase() !== "en"
	) {
		return null;
	}

	const cardId = normalizeCardId(rawId);
	const setCode = record.setCode ?? inferSetCode(cardId);

	return {
		cardId,
		name: record.name,
		setCode,
		setName: record.setName ?? setCode,
		variant: record.variant ?? "Standard",
		rarity: record.rarity ?? "Unknown",
		color: record.color ?? "Unknown",
		cardType: record.cardType ?? record.type ?? "Unknown",
		cost: record.cost,
		power: record.power,
		counter: record.counter,
		effectText: record.effectText ?? record.effect,
		imageUrl: record.imageUrl ?? record.image,
		sourceUrl: record.sourceUrl,
		englishAvailable: true,
		updatedAt: record.updatedAt,
	};
}
