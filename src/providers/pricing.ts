import type { PriceSnapshot } from "../types.js";

type RawPriceRecord = {
	cardId?: string;
	id?: string;
	marketPrice?: number;
	lowPrice?: number;
	currency?: string;
	source?: string;
	capturedAt?: string;
};

export async function fetchPriceSnapshots(
	feedUrl: string,
	page: number,
): Promise<{ snapshots: PriceSnapshot[]; hasMore: boolean }> {
	const url = new URL(feedUrl);
	url.searchParams.set("page", String(page));

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Price feed request failed with ${response.status}.`);
	}

	const payload = (await response.json()) as {
		data?: RawPriceRecord[];
		prices?: RawPriceRecord[];
		hasMore?: boolean;
		current_page?: number;
		last_page?: number;
	};

	const rows = payload.data ?? payload.prices ?? [];
	const snapshots = rows
		.map(normalizePriceRecord)
		.filter((snapshot): snapshot is PriceSnapshot => Boolean(snapshot));

	const hasMore =
		payload.hasMore ??
		(payload.current_page !== undefined &&
			payload.last_page !== undefined &&
			payload.current_page < payload.last_page);

	return { snapshots, hasMore: Boolean(hasMore) };
}

export function normalizePriceRecord(record: RawPriceRecord): PriceSnapshot | null {
	const cardId = record.cardId ?? record.id;
	if (!cardId || typeof record.marketPrice !== "number") {
		return null;
	}

	return {
		cardId,
		marketPrice: record.marketPrice,
		lowPrice: record.lowPrice,
		currency: record.currency ?? "USD",
		source: record.source ?? "Unknown",
		capturedAt: record.capturedAt ?? new Date().toISOString(),
	};
}
