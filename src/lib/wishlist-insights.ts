export type WishlistItem = {
	ownerName: string;
	cardId: string;
	cardName: string;
	priority: "High" | "Medium" | "Low" | "Unset";
	targetPrice: number | null;
	reason?: string | null;
	status?: "Open" | "Acquired" | "Snoozed" | string | null;
};

export type EnrichedWishlistItem = WishlistItem & {
	currentMarketPrice: number | null;
	dollarsBelowTarget: number | null;
	percentBelowTarget: number | null;
	targetHit: boolean;
};

export type WishlistBudget = {
	ownerName: string;
	itemCount: number;
	openItemCount: number;
	totalTargetSpend: number;
	totalCurrentSpend: number;
	totalSavingsAtTarget: number;
};

export type WishlistRecommendation = {
	item: EnrichedWishlistItem;
	reason: string;
};

export type MasterSetMissingCard = {
	cardId: string;
	cardName: string;
	marketPrice?: number | null;
	source: string;
};

export type WishlistSuggestion = {
	cardId: string;
	cardName: string;
	suggestedPriority: "High" | "Medium" | "Low";
	source: string;
	estimatedPrice: number | null;
	reason: string;
};

const PRIORITY_RANK: Record<string, number> = {
	High: 0,
	Medium: 1,
	Low: 2,
	Unset: 3,
};

function normalizeId(id: string): string {
	return id.trim().toUpperCase();
}

export function enrichWishlist(
	items: ReadonlyArray<WishlistItem>,
	marketPrices: ReadonlyMap<string, number>,
): EnrichedWishlistItem[] {
	const normalizedPrices = new Map<string, number>();
	for (const [key, value] of marketPrices) {
		normalizedPrices.set(normalizeId(key), value);
	}
	return items.map((item) => {
		const currentMarketPrice =
			normalizedPrices.get(normalizeId(item.cardId)) ?? null;
		const dollarsBelowTarget =
			item.targetPrice !== null && currentMarketPrice !== null
				? round2(item.targetPrice - currentMarketPrice)
				: null;
		const percentBelowTarget =
			item.targetPrice !== null &&
			currentMarketPrice !== null &&
			item.targetPrice > 0
				? round2(((item.targetPrice - currentMarketPrice) / item.targetPrice) * 100)
				: null;
		const targetHit =
			item.targetPrice !== null &&
			currentMarketPrice !== null &&
			currentMarketPrice <= item.targetPrice;
		return {
			...item,
			currentMarketPrice,
			dollarsBelowTarget,
			percentBelowTarget,
			targetHit,
		};
	});
}

export function summarizeWishlistBudget(
	items: ReadonlyArray<EnrichedWishlistItem>,
	ownerName: string,
): WishlistBudget {
	const owned = items.filter(
		(i) =>
			i.ownerName === ownerName &&
			(i.status ?? "Open") !== "Acquired",
	);
	let totalTarget = 0;
	let totalCurrent = 0;
	for (const i of owned) {
		if (typeof i.targetPrice === "number") totalTarget += i.targetPrice;
		if (typeof i.currentMarketPrice === "number") totalCurrent += i.currentMarketPrice;
	}
	return {
		ownerName,
		itemCount: items.filter((i) => i.ownerName === ownerName).length,
		openItemCount: owned.length,
		totalTargetSpend: round2(totalTarget),
		totalCurrentSpend: round2(totalCurrent),
		totalSavingsAtTarget: round2(totalCurrent - totalTarget),
	};
}

export function findNextPurchases(
	items: ReadonlyArray<EnrichedWishlistItem>,
	ownerName: string,
	limit = 5,
): WishlistRecommendation[] {
	const candidates = items
		.filter(
			(i) =>
				i.ownerName === ownerName &&
				(i.status ?? "Open") !== "Acquired" &&
				i.targetHit,
		)
		.slice()
		.sort((a, b) => {
			const pa = PRIORITY_RANK[a.priority] ?? 99;
			const pb = PRIORITY_RANK[b.priority] ?? 99;
			if (pa !== pb) return pa - pb;
			return (a.currentMarketPrice ?? 0) - (b.currentMarketPrice ?? 0);
		});
	return candidates.slice(0, Math.max(1, limit)).map((item) => ({
		item,
		reason: buildPurchaseReason(item),
	}));
}

export function suggestWishlistFromMasterSet(
	missingCards: ReadonlyArray<MasterSetMissingCard>,
	existingWishlistCardIds: ReadonlySet<string>,
	options: { defaultPriority?: "High" | "Medium" | "Low"; limit?: number } = {},
): WishlistSuggestion[] {
	const have = new Set<string>();
	for (const id of existingWishlistCardIds) have.add(normalizeId(id));
	const defaultPriority = options.defaultPriority ?? "Medium";
	const limit = Math.max(1, options.limit ?? 25);

	const candidates: WishlistSuggestion[] = [];
	for (const missing of missingCards) {
		const key = normalizeId(missing.cardId);
		if (have.has(key)) continue;
		candidates.push({
			cardId: missing.cardId,
			cardName: missing.cardName,
			suggestedPriority: defaultPriority,
			source: missing.source,
			estimatedPrice: missing.marketPrice ?? null,
			reason: `Missing from ${missing.source}`,
		});
	}
	candidates.sort(
		(a, b) => (a.estimatedPrice ?? Infinity) - (b.estimatedPrice ?? Infinity),
	);
	return candidates.slice(0, limit);
}

function buildPurchaseReason(item: EnrichedWishlistItem): string {
	if (!item.targetHit || item.currentMarketPrice === null) {
		return "Target not yet hit";
	}
	const savings =
		item.dollarsBelowTarget && item.dollarsBelowTarget > 0
			? `$${item.dollarsBelowTarget.toFixed(2)} below your $${(item.targetPrice ?? 0).toFixed(2)} target`
			: `at or under your $${(item.targetPrice ?? 0).toFixed(2)} target`;
	return `${item.priority} priority · ${savings}`;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
