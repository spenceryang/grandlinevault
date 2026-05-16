import type { MasterSetEntry } from "./master-set.js";

export type SetAnalyticsRow = {
	setId: string;
	setName: string;
	totalCards: number;
	owned: number;
	completionFraction: number;
	baseTotal: number;
	baseOwned: number;
	parallelTotal: number;
	parallelOwned: number;
	totalMarketValue: number;
	ownedMarketValue: number;
};

export type RarityRow = {
	rarity: string;
	count: number;
	owned: number;
	totalMarketValue: number;
	ownedMarketValue: number;
};

export type ColorRow = {
	color: string;
	count: number;
	owned: number;
};

export type TopCardRow = {
	cardImageId: string;
	cardSetId: string;
	name: string;
	setId: string | null;
	setName: string | null;
	rarity: string | null;
	marketPrice: number;
	owned: boolean;
};

export type AnalyticsInputCard = MasterSetEntry & {
	owned: boolean;
	marketPrice: number | null;
};

export function summarizeSetCompletion(
	cards: ReadonlyArray<AnalyticsInputCard>,
): SetAnalyticsRow[] {
	const grouped = new Map<string, AnalyticsInputCard[]>();
	for (const card of cards) {
		const key = card.setId ?? "UNKNOWN";
		const bucket = grouped.get(key);
		if (bucket) {
			bucket.push(card);
		} else {
			grouped.set(key, [card]);
		}
	}

	const rows: SetAnalyticsRow[] = [];
	for (const [setId, bucket] of grouped) {
		const totalCards = bucket.length;
		const owned = bucket.filter((c) => c.owned).length;
		const base = bucket.filter((c) => c.variant === "base");
		const parallel = bucket.filter((c) => c.variant === "parallel");
		const totalMarketValue = bucket.reduce(
			(sum, c) => sum + (c.marketPrice ?? 0),
			0,
		);
		const ownedMarketValue = bucket.reduce(
			(sum, c) => sum + (c.owned ? c.marketPrice ?? 0 : 0),
			0,
		);
		const completionFraction = totalCards === 0 ? 0 : owned / totalCards;
		rows.push({
			setId,
			setName: bucket[0].setName ?? setId,
			totalCards,
			owned,
			completionFraction,
			baseTotal: base.length,
			baseOwned: base.filter((c) => c.owned).length,
			parallelTotal: parallel.length,
			parallelOwned: parallel.filter((c) => c.owned).length,
			totalMarketValue: round2(totalMarketValue),
			ownedMarketValue: round2(ownedMarketValue),
		});
	}
	rows.sort((a, b) => b.completionFraction - a.completionFraction);
	return rows;
}

export function summarizeRarityBreakdown(
	cards: ReadonlyArray<AnalyticsInputCard>,
): RarityRow[] {
	const grouped = new Map<string, AnalyticsInputCard[]>();
	for (const card of cards) {
		const key = card.rarity ?? "Unknown";
		const bucket = grouped.get(key);
		if (bucket) bucket.push(card);
		else grouped.set(key, [card]);
	}
	const rows: RarityRow[] = [];
	for (const [rarity, bucket] of grouped) {
		rows.push({
			rarity,
			count: bucket.length,
			owned: bucket.filter((c) => c.owned).length,
			totalMarketValue: round2(
				bucket.reduce((sum, c) => sum + (c.marketPrice ?? 0), 0),
			),
			ownedMarketValue: round2(
				bucket.reduce(
					(sum, c) => sum + (c.owned ? c.marketPrice ?? 0 : 0),
					0,
				),
			),
		});
	}
	rows.sort((a, b) => b.count - a.count);
	return rows;
}

export function summarizeColorBreakdown(
	cards: ReadonlyArray<AnalyticsInputCard>,
): ColorRow[] {
	const grouped = new Map<string, AnalyticsInputCard[]>();
	for (const card of cards) {
		const key = card.color ?? "Unknown";
		const bucket = grouped.get(key);
		if (bucket) bucket.push(card);
		else grouped.set(key, [card]);
	}
	const rows: ColorRow[] = [];
	for (const [color, bucket] of grouped) {
		rows.push({
			color,
			count: bucket.length,
			owned: bucket.filter((c) => c.owned).length,
		});
	}
	rows.sort((a, b) => b.count - a.count);
	return rows;
}

export function topMostValuableCards(
	cards: ReadonlyArray<AnalyticsInputCard>,
	limit = 10,
): TopCardRow[] {
	const ranked = cards
		.filter((c) => (c.marketPrice ?? 0) > 0)
		.slice()
		.sort((a, b) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0));
	return ranked.slice(0, Math.max(1, limit)).map((c) => ({
		cardImageId: c.variantId,
		cardSetId: c.baseCardId,
		name: c.name,
		setId: c.setId,
		setName: c.setName,
		rarity: c.rarity,
		marketPrice: c.marketPrice ?? 0,
		owned: c.owned,
	}));
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
