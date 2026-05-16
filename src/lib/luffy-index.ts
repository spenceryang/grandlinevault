export const LUFFY_NAME_PATTERN = /Monkey[\s.]*D[\s.]*Luffy|^Luffy\b/i;

export type LuffyIndexVariantKind = "base" | "parallel" | "alt-art" | "promo";

export type LuffyIndexSourceCard = {
	card_set_id: string;
	card_image_id: string;
	card_name: string;
	set_id: string | null;
	set_name: string | null;
	rarity: string | null;
	card_color: string | null;
	card_type: string | null;
	card_image: string;
	market_price: number | null;
};

export type LuffyIndexEntry = {
	variantId: string;
	baseCardId: string;
	name: string;
	setId: string | null;
	setName: string | null;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	variant: LuffyIndexVariantKind;
	imageUrl: string;
	marketPrice: number;
	weight: number;
};

export type LuffyIndexSummary = {
	holdings: number;
	totalMarketValue: number;
	averagePrice: number;
	medianPrice: number;
	maxPrice: number;
	topHoldings: LuffyIndexEntry[];
	setDistribution: Array<{ setId: string; setName: string; count: number; marketValue: number }>;
};

export function isLuffyCard(name: string): boolean {
	return LUFFY_NAME_PATTERN.test(name);
}

export function classifyLuffyVariant(
	imageId: string,
	baseId: string,
): LuffyIndexVariantKind {
	const suffix = imageId.replace(baseId, "");
	if (suffix === "") return "base";
	if (/^_p\d+$/i.test(suffix)) return "parallel";
	if (/_alt|_r\d+/i.test(suffix)) return "alt-art";
	return "promo";
}

export function buildLuffyIndex(
	cards: ReadonlyArray<LuffyIndexSourceCard>,
): LuffyIndexEntry[] {
	const luffy = cards
		.filter((c) => isLuffyCard(c.card_name))
		.filter((c) => typeof c.market_price === "number" && c.market_price > 0);
	const total = luffy.reduce((sum, c) => sum + (c.market_price ?? 0), 0);
	return luffy
		.map((c) => {
			const price = c.market_price ?? 0;
			return {
				variantId: c.card_image_id,
				baseCardId: c.card_set_id,
				name: c.card_name,
				setId: c.set_id,
				setName: c.set_name,
				rarity: c.rarity,
				color: c.card_color,
				cardType: c.card_type,
				variant: classifyLuffyVariant(c.card_image_id, c.card_set_id),
				imageUrl: c.card_image,
				marketPrice: round2(price),
				weight: total === 0 ? 0 : price / total,
			};
		})
		.sort((a, b) => b.marketPrice - a.marketPrice);
}

export function summarizeLuffyIndex(
	entries: ReadonlyArray<LuffyIndexEntry>,
	topN = 10,
): LuffyIndexSummary {
	const holdings = entries.length;
	const prices = entries.map((e) => e.marketPrice);
	const totalMarketValue = prices.reduce((s, p) => s + p, 0);
	const averagePrice = holdings === 0 ? 0 : totalMarketValue / holdings;
	const medianPrice = median(prices);
	const maxPrice = holdings === 0 ? 0 : Math.max(...prices);

	const bySet = new Map<
		string,
		{ setName: string; count: number; marketValue: number }
	>();
	for (const e of entries) {
		const key = e.setId ?? "UNKNOWN";
		const existing = bySet.get(key);
		if (existing) {
			existing.count += 1;
			existing.marketValue += e.marketPrice;
		} else {
			bySet.set(key, {
				setName: e.setName ?? key,
				count: 1,
				marketValue: e.marketPrice,
			});
		}
	}
	const setDistribution = Array.from(bySet.entries())
		.map(([setId, info]) => ({
			setId,
			setName: info.setName,
			count: info.count,
			marketValue: round2(info.marketValue),
		}))
		.sort((a, b) => b.marketValue - a.marketValue);

	return {
		holdings,
		totalMarketValue: round2(totalMarketValue),
		averagePrice: round2(averagePrice),
		medianPrice: round2(medianPrice),
		maxPrice: round2(maxPrice),
		topHoldings: entries.slice(0, Math.max(1, topN)),
		setDistribution,
	};
}

function median(values: ReadonlyArray<number>): number {
	if (values.length === 0) return 0;
	const sorted = values.slice().sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
