export const OPTCG_API_BASE = "https://optcgapi.com/api";

export type OptcgRawCard = {
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

export type OptcgSetCard = {
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
	dateScraped: string;
};

export async function getOptcgSet(setId: string): Promise<OptcgSetCard[]> {
	const id = setId.trim().toUpperCase();
	if (!id) {
		throw new Error("setId must not be empty.");
	}
	const url = `${OPTCG_API_BASE}/sets/${encodeURIComponent(id)}/`;
	const response = await fetch(url, {
		headers: { accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`OPTCG API request failed with ${response.status}.`);
	}
	const data = (await response.json()) as OptcgRawCard[] | { error: string };
	if (!Array.isArray(data)) {
		throw new Error(data.error || `OPTCG returned no cards for set ${id}.`);
	}
	return data.map(toSetCard);
}

export function toSetCard(raw: OptcgRawCard): OptcgSetCard {
	return {
		cardSetId: raw.card_set_id,
		cardImageId: raw.card_image_id,
		name: raw.card_name,
		setName: raw.set_name,
		setId: raw.set_id,
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
		dateScraped: raw.date_scraped,
	};
}

function parseNumeric(value: string | null): number | null {
	if (value === null || value === "") return null;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? null : parsed;
}
