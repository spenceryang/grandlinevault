export type PriceSnapshotInput = {
	cardId: string;
	capturedAt: string;
	marketPrice: number;
};

export type PriceMover = {
	cardId: string;
	oldPrice: number;
	newPrice: number;
	dollarChange: number;
	percentChange: number;
	oldCapturedAt: string;
	newCapturedAt: string;
};

export type PriceMoverReport = {
	windowDays: number;
	asOf: string;
	cardCount: number;
	topGainers: PriceMover[];
	topLosers: PriceMover[];
};

export type PriceMoverOptions = {
	windowDays?: number;
	now?: Date;
	limit?: number;
	minOldPrice?: number;
};

export function computePriceMovers(
	snapshots: ReadonlyArray<PriceSnapshotInput>,
	options: PriceMoverOptions = {},
): PriceMoverReport {
	const windowDays = Math.max(1, options.windowDays ?? 7);
	const limit = Math.max(1, options.limit ?? 10);
	const minOldPrice = options.minOldPrice ?? 1;
	const now = options.now ?? new Date();
	const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

	const byCard = new Map<string, PriceSnapshotInput[]>();
	for (const snap of snapshots) {
		const key = snap.cardId.trim();
		if (!key) continue;
		const bucket = byCard.get(key);
		if (bucket) bucket.push(snap);
		else byCard.set(key, [snap]);
	}

	const movers: PriceMover[] = [];
	for (const [cardId, history] of byCard) {
		const sorted = history
			.slice()
			.sort(
				(a, b) =>
					new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
			);
		const newest = sorted[sorted.length - 1];
		if (!newest) continue;
		// Pick the snapshot closest to the cutoff that is still <= cutoff;
		// if none exist (newer card), fall back to the oldest snapshot we have.
		const baseline =
			sorted
				.filter((s) => new Date(s.capturedAt).getTime() <= cutoff.getTime())
				.pop() ?? sorted[0];
		if (baseline === newest) continue;
		if (baseline.marketPrice < minOldPrice) continue;
		const dollarChange = newest.marketPrice - baseline.marketPrice;
		if (dollarChange === 0) continue;
		const percentChange = (dollarChange / baseline.marketPrice) * 100;
		movers.push({
			cardId,
			oldPrice: round2(baseline.marketPrice),
			newPrice: round2(newest.marketPrice),
			dollarChange: round2(dollarChange),
			percentChange: round2(percentChange),
			oldCapturedAt: baseline.capturedAt,
			newCapturedAt: newest.capturedAt,
		});
	}

	const topGainers = movers
		.filter((m) => m.percentChange > 0)
		.sort((a, b) => b.percentChange - a.percentChange)
		.slice(0, limit);
	const topLosers = movers
		.filter((m) => m.percentChange < 0)
		.sort((a, b) => a.percentChange - b.percentChange)
		.slice(0, limit);

	return {
		windowDays,
		asOf: now.toISOString(),
		cardCount: byCard.size,
		topGainers,
		topLosers,
	};
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
