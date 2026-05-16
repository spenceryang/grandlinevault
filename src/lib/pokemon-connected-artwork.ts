export type ConnectedArtworkCard = {
	cardId: string;
	position: number;
	name: string;
	imageUrl?: string | null;
};

export type ConnectedArtworkSet = {
	id: string;
	title: string;
	series: string;
	setId: string | null;
	cards: ConnectedArtworkCard[];
	notes?: string | null;
};

export type ConnectedArtworkOwnershipRow = {
	setId: string;
	setTitle: string;
	series: string;
	cardId: string;
	position: number;
	cardName: string;
	imageUrl: string | null;
	owned: boolean;
};

export type ConnectedArtworkSetSummary = {
	id: string;
	title: string;
	series: string;
	setId: string | null;
	totalCards: number;
	ownedCards: number;
	completionFraction: number;
	complete: boolean;
	missingCardIds: string[];
};

export function buildOwnershipRows(
	sets: ReadonlyArray<ConnectedArtworkSet>,
	ownedIds: ReadonlySet<string>,
): ConnectedArtworkOwnershipRow[] {
	const normalized = new Set<string>();
	for (const id of ownedIds) normalized.add(id.trim().toUpperCase());

	const rows: ConnectedArtworkOwnershipRow[] = [];
	for (const set of sets) {
		for (const card of set.cards) {
			rows.push({
				setId: set.id,
				setTitle: set.title,
				series: set.series,
				cardId: card.cardId,
				position: card.position,
				cardName: card.name,
				imageUrl: card.imageUrl ?? null,
				owned: normalized.has(card.cardId.toUpperCase()),
			});
		}
	}
	rows.sort((a, b) => {
		if (a.setTitle !== b.setTitle) return a.setTitle.localeCompare(b.setTitle);
		return a.position - b.position;
	});
	return rows;
}

export function summarizeConnectedArtworkSets(
	sets: ReadonlyArray<ConnectedArtworkSet>,
	ownedIds: ReadonlySet<string>,
): ConnectedArtworkSetSummary[] {
	const normalized = new Set<string>();
	for (const id of ownedIds) normalized.add(id.trim().toUpperCase());

	return sets
		.map((set) => {
			const owned = set.cards.filter((c) =>
				normalized.has(c.cardId.toUpperCase()),
			);
			const missing = set.cards.filter(
				(c) => !normalized.has(c.cardId.toUpperCase()),
			);
			return {
				id: set.id,
				title: set.title,
				series: set.series,
				setId: set.setId,
				totalCards: set.cards.length,
				ownedCards: owned.length,
				completionFraction:
					set.cards.length === 0 ? 0 : owned.length / set.cards.length,
				complete: missing.length === 0 && set.cards.length > 0,
				missingCardIds: missing.map((c) => c.cardId),
			};
		})
		.sort((a, b) => b.completionFraction - a.completionFraction);
}

export function findIncompleteSets(
	sets: ReadonlyArray<ConnectedArtworkSet>,
	ownedIds: ReadonlySet<string>,
	threshold = 1,
): ConnectedArtworkSetSummary[] {
	return summarizeConnectedArtworkSets(sets, ownedIds).filter(
		(s) => s.completionFraction < threshold,
	);
}
