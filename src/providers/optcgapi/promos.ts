export const OPTCG_API_BASE = "https://optcgapi.com/api";

export type OptcgPromoRaw = {
	inventory_price: number | null;
	market_price: number | null;
	card_name: string;
	set_name: string | null;
	card_text: string | null;
	set_id: string | null;
	rarity: string | null;
	card_set_id: string;
	card_color: string | null;
	card_type: string | null;
	life: string | null;
	card_cost: string | null;
	card_power: string | null;
	sub_types: string | null;
	counter_amount: number | null;
	attribute: string | null;
	date_scraped: string;
	card_image_id: string;
	card_image: string;
};

export type OptcgPromoCard = {
	cardSetId: string;
	cardImageId: string;
	name: string;
	collectionName: string | null;
	collectionId: string | null;
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
};

export type PromoFilters = {
	color?: string;
	cardType?: string;
	cost?: string;
	rarity?: string;
	cardName?: string;
};

async function fetchJson<T>(path: string): Promise<T> {
	const url = `${OPTCG_API_BASE}${path}`;
	const response = await fetch(url, {
		headers: { accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`OPTCG API request failed with ${response.status}.`);
	}
	return (await response.json()) as T;
}

export async function getOptcgPromoCard(
	cardSetId: string,
): Promise<OptcgPromoCard[]> {
	const id = cardSetId.trim().toUpperCase();
	if (!id) throw new Error("cardSetId must not be empty.");
	const data = await fetchJson<OptcgPromoRaw[] | { error: string; "Error!"?: string }>(
		`/promos/card/${encodeURIComponent(id)}/`,
	);
	if (!Array.isArray(data)) {
		const message = data.error || data["Error!"] || "Promo card not found.";
		throw new Error(message);
	}
	return data.map(toPromoCard);
}

export async function filterOptcgPromoCards(
	filters: PromoFilters,
): Promise<OptcgPromoCard[]> {
	const params = new URLSearchParams();
	if (filters.cardName) params.set("card_name", filters.cardName);
	if (filters.color) params.set("color", filters.color);
	if (filters.cardType) params.set("card_type", filters.cardType);
	if (filters.cost) params.set("card_cost", filters.cost);
	if (filters.rarity) params.set("rarity", filters.rarity);
	if ([...params.keys()].length === 0) {
		throw new Error(
			"At least one filter (cardName, color, cardType, cost, or rarity) must be provided.",
		);
	}
	const data = await fetchJson<OptcgPromoRaw[] | { error: string }>(
		`/promos/filtered/?${params.toString()}`,
	);
	if (!Array.isArray(data)) {
		throw new Error(data.error || "No matching promo cards found.");
	}
	return data.map(toPromoCard);
}

export function toPromoCard(raw: OptcgPromoRaw): OptcgPromoCard {
	return {
		cardSetId: raw.card_set_id,
		cardImageId: raw.card_image_id,
		name: raw.card_name,
		collectionName: raw.set_name,
		collectionId: raw.set_id,
		rarity: raw.rarity,
		color: raw.card_color,
		cardType: raw.card_type,
		cost: parseNumeric(raw.card_cost),
		power: parseNumeric(raw.card_power),
		counter: raw.counter_amount,
		life: parseNumeric(raw.life),
		subTypes: raw.sub_types,
		attribute: raw.attribute,
		text: raw.card_text,
		inventoryPrice: raw.inventory_price,
		marketPrice: raw.market_price,
		imageUrl: raw.card_image,
	};
}

function parseNumeric(value: string | null): number | null {
	if (value === null || value === "") return null;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? null : parsed;
}
