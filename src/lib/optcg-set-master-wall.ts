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

export type OptcgSetMasterWallOptions = {
	/**
	 * Width (in px) to resize both color and greyscale images through wsrv.nl.
	 * Smaller values = tighter grid + faster Notion page loads. Recommended
	 * presets: 280 (Notion gallery card Small), 360 (Medium), 480 (Large).
	 * When undefined, images are served at their original optcgapi resolution.
	 */
	thumbnailWidth?: number;
};

export const WSRV_BASE = "https://wsrv.nl/";
export const WSRV_GREYSCALE_BASE = WSRV_BASE;

export const COMPACT_GRID_WIDTH = 280;
export const STANDARD_GRID_WIDTH = 360;
export const SHOWCASE_GRID_WIDTH = 480;

/**
 * Map a `BINDER_DENSITY` env value (small/medium/large) to a wsrv.nl
 * thumbnail width. Unrecognized or empty values fall back to Medium
 * so the binder always renders at a sensible default.
 */
export function resolveBinderWidth(density: string | undefined): number {
	switch (density?.trim().toLowerCase()) {
		case "small":
			return COMPACT_GRID_WIDTH;
		case "large":
			return SHOWCASE_GRID_WIDTH;
		case "medium":
		default:
			return STANDARD_GRID_WIDTH;
	}
}

export function toGreyscaleImageUrl(
	imageUrl: string,
	thumbnailWidth?: number,
): string {
	const widthParam =
		typeof thumbnailWidth === "number" && thumbnailWidth > 0
			? `&w=${Math.round(thumbnailWidth)}&fit=cover&q=80`
			: "";
	return `${WSRV_BASE}?url=${encodeURIComponent(imageUrl)}&filt=greyscale&output=jpg${widthParam}`;
}

export function toCompactColorImageUrl(
	imageUrl: string,
	thumbnailWidth?: number,
): string {
	if (typeof thumbnailWidth !== "number" || thumbnailWidth <= 0) {
		return imageUrl;
	}
	return `${WSRV_BASE}?url=${encodeURIComponent(imageUrl)}&output=jpg&w=${Math.round(thumbnailWidth)}&fit=cover&q=85`;
}

export function buildOptcgSetMasterWallEntries(
	setId: string,
	cards: ReadonlyArray<OptcgSetMasterWallSourceCard>,
	ownedIds: ReadonlySet<string>,
	options: OptcgSetMasterWallOptions = {},
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
			colorImageUrl: toCompactColorImageUrl(card.imageUrl, options.thumbnailWidth),
			greyscaleImageUrl: toGreyscaleImageUrl(
				card.imageUrl,
				options.thumbnailWidth,
			),
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
