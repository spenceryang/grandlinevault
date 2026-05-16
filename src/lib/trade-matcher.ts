import type { OwnedCardRecord } from "./collection.js";

export type WishlistRecord = {
	ownerName: string;
	cardId: string;
	cardName: string;
	priority?: string | null;
	targetPrice?: number | null;
};

export type TradeMatch = {
	fromOwner: string;
	toOwner: string;
	cardId: string;
	cardName: string;
	availableQuantity: number;
	priority: string | null;
	targetPrice: number | null;
};

export type TradeSummaryRow = {
	fromOwner: string;
	toOwner: string;
	matchCount: number;
	totalAvailable: number;
};

const PRIORITY_RANK: Record<string, number> = {
	high: 0,
	medium: 1,
	low: 2,
};

function normalizeId(id: string): string {
	return id.trim().toUpperCase();
}

export function matchTrades(
	owned: ReadonlyArray<OwnedCardRecord>,
	wishlists: ReadonlyArray<WishlistRecord>,
): TradeMatch[] {
	const wishesByCard = new Map<string, WishlistRecord[]>();
	for (const w of wishlists) {
		const key = normalizeId(w.cardId);
		if (!key) continue;
		const bucket = wishesByCard.get(key);
		if (bucket) bucket.push(w);
		else wishesByCard.set(key, [w]);
	}

	const matches: TradeMatch[] = [];
	for (const card of owned) {
		const key = normalizeId(card.cardId);
		if (!key) continue;
		if (card.quantity <= 1) continue;
		const wishers = wishesByCard.get(key);
		if (!wishers) continue;
		const available = card.quantity - 1;
		for (const wish of wishers) {
			if (wish.ownerName === card.ownerName) continue;
			matches.push({
				fromOwner: card.ownerName,
				toOwner: wish.ownerName,
				cardId: key,
				cardName: card.cardName,
				availableQuantity: available,
				priority: wish.priority ?? null,
				targetPrice: wish.targetPrice ?? null,
			});
		}
	}

	matches.sort((a, b) => {
		const priorityDelta =
			(PRIORITY_RANK[a.priority?.toLowerCase() ?? ""] ?? 99) -
			(PRIORITY_RANK[b.priority?.toLowerCase() ?? ""] ?? 99);
		if (priorityDelta !== 0) return priorityDelta;
		return b.availableQuantity - a.availableQuantity;
	});

	return matches;
}

export function summarizeTradeMatchesByOwner(
	matches: ReadonlyArray<TradeMatch>,
): TradeSummaryRow[] {
	const byPair = new Map<
		string,
		{ fromOwner: string; toOwner: string; matchCount: number; totalAvailable: number }
	>();
	for (const m of matches) {
		const key = `${m.fromOwner}>>${m.toOwner}`;
		const existing = byPair.get(key);
		if (existing) {
			existing.matchCount += 1;
			existing.totalAvailable += m.availableQuantity;
		} else {
			byPair.set(key, {
				fromOwner: m.fromOwner,
				toOwner: m.toOwner,
				matchCount: 1,
				totalAvailable: m.availableQuantity,
			});
		}
	}
	return Array.from(byPair.values()).sort(
		(a, b) => b.matchCount - a.matchCount,
	);
}
