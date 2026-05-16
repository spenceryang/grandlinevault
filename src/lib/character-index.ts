export type CharacterIndexSourceCard = {
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

export type CharacterIndexVariantKind = "base" | "parallel" | "alt-art" | "promo";

export type CharacterIndexEntry = {
	character: string;
	variantId: string;
	baseCardId: string;
	name: string;
	setId: string | null;
	setName: string | null;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	variant: CharacterIndexVariantKind;
	imageUrl: string;
	marketPrice: number;
	weight: number;
};

export type CharacterIndexSummary = {
	character: string;
	holdings: number;
	totalMarketValue: number;
	averagePrice: number;
	maxPrice: number;
	topHoldings: CharacterIndexEntry[];
};

export const LUFFY_PATTERNS: ReadonlyArray<RegExp> = [
	/Monkey[\s.]*D[\s.]*Luffy/i,
	/^Luffy\b/i,
];

export const ZORO_PATTERNS: ReadonlyArray<RegExp> = [
	/Roronoa[\s.]*Zoro/i,
];

export const SANJI_PATTERNS: ReadonlyArray<RegExp> = [
	/Vinsmoke[\s.]*Sanji/i,
	/^Sanji\b/i,
	/\bSanji\b/i,
];

export const NAMI_PATTERNS: ReadonlyArray<RegExp> = [/\bNami\b/i];
export const USOPP_PATTERNS: ReadonlyArray<RegExp> = [/\bUsopp\b/i];
export const CHOPPER_PATTERNS: ReadonlyArray<RegExp> = [/Tony[\s.]*Tony[\s.]*Chopper/i, /\bChopper\b/i];
export const ROBIN_PATTERNS: ReadonlyArray<RegExp> = [/Nico[\s.]*Robin/i, /\bRobin\b/i];
export const FRANKY_PATTERNS: ReadonlyArray<RegExp> = [/\bFranky\b/i];
export const BROOK_PATTERNS: ReadonlyArray<RegExp> = [/\bBrook\b/i];
export const JINBE_PATTERNS: ReadonlyArray<RegExp> = [/\bJinbe[i]?\b/i, /\bJimbei\b/i];

export const STRAWHAT_PATTERNS: ReadonlyArray<RegExp> = [
	...LUFFY_PATTERNS,
	...ZORO_PATTERNS,
	...SANJI_PATTERNS,
	...NAMI_PATTERNS,
	...USOPP_PATTERNS,
	...CHOPPER_PATTERNS,
	...ROBIN_PATTERNS,
	...FRANKY_PATTERNS,
	...BROOK_PATTERNS,
	...JINBE_PATTERNS,
];

export const YONKO_PATTERNS: ReadonlyArray<RegExp> = [
	/\bKaido\b/i,
	/Big[\s.]*Mom/i,
	/Charlotte[\s.]*Linlin/i,
	/\bShanks\b/i,
	/\bBlackbeard\b/i,
	/Marshall[\s.]*D[\s.]*Teach/i,
	/Whitebeard/i,
	/Edward[\s.]*Newgate/i,
	...LUFFY_PATTERNS,
];

export const DONQUIXOTE_PATTERNS: ReadonlyArray<RegExp> = [
	/Donquixote/i,
	/\bDoflamingo\b/i,
	/\bCorazon\b/i,
];

export const CHARACTER_INDEX_REGISTRY: Record<
	string,
	ReadonlyArray<RegExp>
> = {
	Luffy: LUFFY_PATTERNS,
	Zoro: ZORO_PATTERNS,
	Sanji: SANJI_PATTERNS,
	Nami: NAMI_PATTERNS,
	Strawhat: STRAWHAT_PATTERNS,
	Yonko: YONKO_PATTERNS,
	Donquixote: DONQUIXOTE_PATTERNS,
};

export function matchesAnyPattern(
	name: string,
	patterns: ReadonlyArray<RegExp>,
): boolean {
	return patterns.some((p) => p.test(name));
}

export function classifyCharacterVariant(
	imageId: string,
	baseId: string,
): CharacterIndexVariantKind {
	const suffix = imageId.replace(baseId, "");
	if (suffix === "") return "base";
	if (/^_p\d+$/i.test(suffix)) return "parallel";
	if (/_alt|_r\d+/i.test(suffix)) return "alt-art";
	return "promo";
}

export function buildCharacterIndex(
	character: string,
	cards: ReadonlyArray<CharacterIndexSourceCard>,
	patterns: ReadonlyArray<RegExp>,
): CharacterIndexEntry[] {
	const matched = cards
		.filter((c) => matchesAnyPattern(c.card_name, patterns))
		.filter((c) => typeof c.market_price === "number" && c.market_price > 0);
	const total = matched.reduce((s, c) => s + (c.market_price ?? 0), 0);

	return matched
		.map((c) => {
			const price = c.market_price ?? 0;
			return {
				character,
				variantId: c.card_image_id,
				baseCardId: c.card_set_id,
				name: c.card_name,
				setId: c.set_id,
				setName: c.set_name,
				rarity: c.rarity,
				color: c.card_color,
				cardType: c.card_type,
				variant: classifyCharacterVariant(c.card_image_id, c.card_set_id),
				imageUrl: c.card_image,
				marketPrice: round2(price),
				weight: total === 0 ? 0 : price / total,
			};
		})
		.sort((a, b) => b.marketPrice - a.marketPrice);
}

export function summarizeCharacterIndex(
	character: string,
	entries: ReadonlyArray<CharacterIndexEntry>,
	topN = 5,
): CharacterIndexSummary {
	const holdings = entries.length;
	const totalMarketValue = entries.reduce((s, e) => s + e.marketPrice, 0);
	const averagePrice = holdings === 0 ? 0 : totalMarketValue / holdings;
	const maxPrice = holdings === 0 ? 0 : Math.max(...entries.map((e) => e.marketPrice));
	return {
		character,
		holdings,
		totalMarketValue: round2(totalMarketValue),
		averagePrice: round2(averagePrice),
		maxPrice: round2(maxPrice),
		topHoldings: entries.slice(0, Math.max(1, topN)),
	};
}

export function buildAllRegisteredIndices(
	cards: ReadonlyArray<CharacterIndexSourceCard>,
	registry: Record<string, ReadonlyArray<RegExp>> = CHARACTER_INDEX_REGISTRY,
): Record<string, CharacterIndexEntry[]> {
	const result: Record<string, CharacterIndexEntry[]> = {};
	for (const [character, patterns] of Object.entries(registry)) {
		result[character] = buildCharacterIndex(character, cards, patterns);
	}
	return result;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
