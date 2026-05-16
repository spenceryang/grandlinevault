export type OptcgSetMasterWallSourceCard = {
	cardSetId: string;
	cardImageId: string;
	name: string;
	setId: string | null;
	setName: string | null;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	imageUrl: string;
};

export type OptcgSetMasterWallEntry = {
	setId: string;
	setName: string;
	cardSetId: string;
	cardImageId: string;
	name: string;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	colorImageUrl: string;
	greyscaleImageUrl: string;
	owned: boolean;
};

export type OptcgSetMasterWallSummary = {
	setId: string;
	setName: string;
	totalCards: number;
	ownedCards: number;
	missingCount: number;
	completionFraction: number;
};

export const WSRV_GREYSCALE_BASE = "https://wsrv.nl/";

export function toGreyscaleImageUrl(imageUrl: string): string {
	return `${WSRV_GREYSCALE_BASE}?url=${encodeURIComponent(imageUrl)}&filt=greyscale&output=jpg`;
}

export function buildOptcgSetMasterWallEntries(
	setId: string,
	cards: ReadonlyArray<OptcgSetMasterWallSourceCard>,
	ownedIds: ReadonlySet<string>,
): OptcgSetMasterWallEntry[] {
	const normalized = new Set<string>();
	for (const id of ownedIds) normalized.add(id.trim().toUpperCase());

	const entries = cards.map((card) => {
		const owned =
			normalized.has(card.cardImageId.toUpperCase()) ||
			normalized.has(card.cardSetId.toUpperCase());
		return {
			setId: card.setId ?? setId,
			setName: card.setName ?? setId,
			cardSetId: card.cardSetId,
			cardImageId: card.cardImageId,
			name: card.name,
			rarity: card.rarity,
			color: card.color,
			cardType: card.cardType,
			colorImageUrl: card.imageUrl,
			greyscaleImageUrl: toGreyscaleImageUrl(card.imageUrl),
			owned,
		};
	});

	entries.sort((a, b) => {
		const aBase = a.cardSetId;
		const bBase = b.cardSetId;
		if (aBase !== bBase) return aBase.localeCompare(bBase);
		// Group variants of the same base card; base before parallels
		if (a.cardImageId === a.cardSetId) return -1;
		if (b.cardImageId === b.cardSetId) return 1;
		return a.cardImageId.localeCompare(b.cardImageId);
	});

	return entries;
}

export function summarizeOptcgSetMasterWall(
	entries: ReadonlyArray<OptcgSetMasterWallEntry>,
): OptcgSetMasterWallSummary {
	const totalCards = entries.length;
	const ownedCards = entries.filter((e) => e.owned).length;
	const completionFraction =
		totalCards === 0 ? 0 : ownedCards / totalCards;
	return {
		setId: entries[0]?.setId ?? "UNKNOWN",
		setName: entries[0]?.setName ?? "Unknown",
		totalCards,
		ownedCards,
		missingCount: totalCards - ownedCards,
		completionFraction,
	};
}
