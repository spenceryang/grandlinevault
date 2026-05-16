export type RelatedCardInput = {
	cardSetId: string;
	cardImageId: string;
	name: string;
	setId: string | null;
	setName: string | null;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	cost: number | null;
	power: number | null;
	subTypes: string | null;
	marketPrice?: number | null;
	imageUrl?: string;
};

export type RelatedCardReason =
	| "same-character"
	| "same-set"
	| "same-color"
	| "same-type"
	| "shared-sub-types"
	| "cost-curve"
	| "same-rarity";

export type RelatedCardResult = {
	card: RelatedCardInput;
	score: number;
	reasons: RelatedCardReason[];
};

export type RelatedCardOptions = {
	limit?: number;
	excludeSelf?: boolean;
	excludeSameVariant?: boolean;
};

const CHARACTER_SUFFIX_PATTERN = /\s*\(.*$/;

export function extractCharacterName(rawName: string): string {
	return rawName.replace(CHARACTER_SUFFIX_PATTERN, "").trim();
}

export function splitSubTypes(value: string | null): string[] {
	if (!value) return [];
	return value
		.split(/\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export function splitColors(value: string | null): string[] {
	if (!value) return [];
	return value
		.split(/[\s/]+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export function scoreRelatedCard(
	target: RelatedCardInput,
	candidate: RelatedCardInput,
): { score: number; reasons: RelatedCardReason[] } {
	const reasons: RelatedCardReason[] = [];
	let score = 0;

	const targetCharacter = extractCharacterName(target.name).toLowerCase();
	const candidateCharacter = extractCharacterName(candidate.name).toLowerCase();
	if (targetCharacter && targetCharacter === candidateCharacter) {
		score += 10;
		reasons.push("same-character");
	}

	if (target.setId && target.setId === candidate.setId) {
		score += 3;
		reasons.push("same-set");
	}

	const targetColors = new Set(splitColors(target.color));
	const candidateColors = new Set(splitColors(candidate.color));
	const sharedColors = [...targetColors].filter((c) => candidateColors.has(c));
	if (sharedColors.length > 0) {
		score += 2 * sharedColors.length;
		reasons.push("same-color");
	}

	if (target.cardType && target.cardType === candidate.cardType) {
		score += 2;
		reasons.push("same-type");
	}

	const targetSubs = new Set(splitSubTypes(target.subTypes));
	const candSubs = new Set(splitSubTypes(candidate.subTypes));
	const sharedSubs = [...targetSubs].filter((s) => candSubs.has(s));
	if (sharedSubs.length > 0) {
		score += 3 * sharedSubs.length;
		reasons.push("shared-sub-types");
	}

	if (
		typeof target.cost === "number" &&
		typeof candidate.cost === "number"
	) {
		const delta = Math.abs(target.cost - candidate.cost);
		if (delta <= 1) {
			score += delta === 0 ? 2 : 1;
			reasons.push("cost-curve");
		}
	}

	if (target.rarity && target.rarity === candidate.rarity) {
		score += 1;
		reasons.push("same-rarity");
	}

	return { score, reasons };
}

export function findRelatedCards(
	target: RelatedCardInput,
	candidates: ReadonlyArray<RelatedCardInput>,
	options: RelatedCardOptions = {},
): RelatedCardResult[] {
	const limit = Math.max(1, options.limit ?? 10);
	const excludeSelf = options.excludeSelf ?? true;
	const excludeSameVariant = options.excludeSameVariant ?? true;

	const ranked = candidates
		.filter((c) => {
			if (excludeSelf && c.cardImageId === target.cardImageId) return false;
			if (excludeSameVariant && c.cardSetId === target.cardSetId) return false;
			return true;
		})
		.map((card) => ({ card, ...scoreRelatedCard(target, card) }))
		.filter((r) => r.score > 0)
		.sort((a, b) => b.score - a.score);

	return ranked.slice(0, limit);
}
