import type { OwnedCardRecord } from "./collection.js";

export type EnrichedDuplicate = OwnedCardRecord & {
	availableCount: number;
	currentMarketPrice: number | null;
	totalValue: number | null;
	tradeableValue: number | null;
};

export type DuplicateOwnerSummary = {
	ownerName: string;
	uniqueDuplicateCards: number;
	totalDuplicateCopies: number;
	totalTradeableCopies: number;
	totalDuplicateValue: number;
	totalTradeableValue: number;
};

export type FindDuplicateOptions = {
	minAvailable?: number;
	ownerName?: string;
};

function normalizeId(id: string): string {
	return id.trim().toUpperCase();
}

export function enrichDuplicates(
	cards: ReadonlyArray<OwnedCardRecord>,
	marketPrices: ReadonlyMap<string, number> = new Map(),
): EnrichedDuplicate[] {
	const normalizedPrices = new Map<string, number>();
	for (const [key, value] of marketPrices) {
		normalizedPrices.set(normalizeId(key), value);
	}

	return cards
		.filter((c) => c.quantity > 1)
		.map((card) => {
			const availableCount = Math.max(0, card.quantity - 1);
			const currentMarketPrice =
				normalizedPrices.get(normalizeId(card.cardId)) ?? null;
			const totalValue =
				currentMarketPrice !== null
					? round2(currentMarketPrice * card.quantity)
					: null;
			const tradeableValue =
				currentMarketPrice !== null
					? round2(currentMarketPrice * availableCount)
					: null;
			return {
				...card,
				availableCount,
				currentMarketPrice,
				totalValue,
				tradeableValue,
			};
		})
		.sort((a, b) => {
			const av = a.tradeableValue ?? 0;
			const bv = b.tradeableValue ?? 0;
			if (av !== bv) return bv - av;
			return b.availableCount - a.availableCount;
		});
}

export function findTradableDuplicates(
	enriched: ReadonlyArray<EnrichedDuplicate>,
	options: FindDuplicateOptions = {},
): EnrichedDuplicate[] {
	const minAvailable = Math.max(1, options.minAvailable ?? 1);
	return enriched.filter((d) => {
		if (d.availableCount < minAvailable) return false;
		if (options.ownerName && d.ownerName !== options.ownerName) return false;
		return true;
	});
}

export function summarizeDuplicatesByOwner(
	enriched: ReadonlyArray<EnrichedDuplicate>,
): DuplicateOwnerSummary[] {
	const byOwner = new Map<string, DuplicateOwnerSummary>();
	for (const dup of enriched) {
		const existing = byOwner.get(dup.ownerName);
		if (existing) {
			existing.uniqueDuplicateCards += 1;
			existing.totalDuplicateCopies += dup.quantity;
			existing.totalTradeableCopies += dup.availableCount;
			if (dup.totalValue !== null) {
				existing.totalDuplicateValue = round2(
					existing.totalDuplicateValue + dup.totalValue,
				);
			}
			if (dup.tradeableValue !== null) {
				existing.totalTradeableValue = round2(
					existing.totalTradeableValue + dup.tradeableValue,
				);
			}
		} else {
			byOwner.set(dup.ownerName, {
				ownerName: dup.ownerName,
				uniqueDuplicateCards: 1,
				totalDuplicateCopies: dup.quantity,
				totalTradeableCopies: dup.availableCount,
				totalDuplicateValue: dup.totalValue ?? 0,
				totalTradeableValue: dup.tradeableValue ?? 0,
			});
		}
	}
	return Array.from(byOwner.values()).sort(
		(a, b) => b.totalTradeableValue - a.totalTradeableValue,
	);
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
