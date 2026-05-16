import { normalizeCardId } from "../../lib/card-id.js";
import type { OptcgCardVariant } from "./get-card.js";
import { getOptcgCard } from "./get-card.js";
import type { OptcgPromoCard } from "./promos.js";
import { getOptcgPromoCard } from "./promos.js";
import type { OptcgStarterCard } from "./starter-decks.js";
import { getOptcgStarterCard } from "./starter-decks.js";

export type CanonicalCardVariant = {
	cardSetId: string;
	cardImageId: string;
	name: string;
	setName: string | null;
	setId: string | null;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	cost: number | null;
	power: number | null;
	counter: number | null;
	life: number | null;
	subTypes: string | null;
	attribute: string | null;
	text: string | null;
	inventoryPrice: number | null;
	marketPrice: number | null;
	imageUrl: string;
	cardSource: "set" | "starter" | "promo";
};

export async function resolveOptcgCardDetails(
	cardId: string,
): Promise<CanonicalCardVariant[]> {
	const id = normalizeCardId(cardId).toUpperCase();
	if (!id) throw new Error("cardId must not be empty.");

	if (isStarterCardId(id)) {
		return (await getOptcgStarterCard(id)).map(fromStarterCard);
	}

	if (isPromoCardId(id)) {
		return (await getOptcgPromoCard(id)).map(fromPromoCard);
	}

	return (await getOptcgCard(id)).map(fromSetCard);
}

export function isStarterCardId(cardId: string): boolean {
	return /^ST\d{2}-\d{3}(?:_.+)?$/i.test(cardId.trim());
}

export function isPromoCardId(cardId: string): boolean {
	return /^P-\d{3}(?:_.+)?$/i.test(cardId.trim());
}

function fromSetCard(card: OptcgCardVariant): CanonicalCardVariant {
	return { ...card, cardSource: "set" };
}

function fromStarterCard(card: OptcgStarterCard): CanonicalCardVariant {
	return {
		...card,
		setName: card.deckName,
		setId: card.deckId,
		cardSource: "starter",
	};
}

function fromPromoCard(card: OptcgPromoCard): CanonicalCardVariant {
	return {
		...card,
		setName: card.collectionName,
		setId: card.collectionId,
		cardSource: "promo",
	};
}
