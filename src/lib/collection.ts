export type OwnedCardRecord = {
	ownerName: string;
	cardId: string;
	cardName: string;
	quantity: number;
};

export type CollectionSummary = {
	ownerName: string;
	totalCopies: number;
	uniqueCards: number;
	duplicateCardCount: number;
	topCardsByQuantity: Array<{
		cardId: string;
		cardName: string;
		quantity: number;
	}>;
};

export function summarizeOwnedCards(
	ownerName: string,
	cards: OwnedCardRecord[],
): CollectionSummary {
	const ownedByTarget = cards.filter((card) => card.ownerName === ownerName);
	const grouped = new Map<
		string,
		{ cardId: string; cardName: string; quantity: number }
	>();

	for (const card of ownedByTarget) {
		const current = grouped.get(card.cardId);
		if (current) {
			current.quantity += card.quantity;
			continue;
		}

		grouped.set(card.cardId, {
			cardId: card.cardId,
			cardName: card.cardName,
			quantity: card.quantity,
		});
	}

	const entries = [...grouped.values()];

	return {
		ownerName,
		totalCopies: entries.reduce((sum, card) => sum + card.quantity, 0),
		uniqueCards: entries.length,
		duplicateCardCount: entries.filter((card) => card.quantity > 1).length,
		topCardsByQuantity: entries
			.sort((a, b) => b.quantity - a.quantity || a.cardName.localeCompare(b.cardName))
			.slice(0, 5),
	};
}

export function findDuplicates(
	ownerName: string,
	cards: OwnedCardRecord[],
): OwnedCardRecord[] {
	const grouped = new Map<string, OwnedCardRecord>();

	for (const card of cards.filter((item) => item.ownerName === ownerName)) {
		const existing = grouped.get(card.cardId);
		if (existing) {
			existing.quantity += card.quantity;
			continue;
		}

		grouped.set(card.cardId, { ...card });
	}

	return [...grouped.values()]
		.filter((card) => card.quantity > 1)
		.sort((a, b) => b.quantity - a.quantity || a.cardName.localeCompare(b.cardName));
}
