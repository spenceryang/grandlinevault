export const OPTCG_API_BASE = "https://optcgapi.com/api";

export type OptcgDonCardRaw = {
	inventory_price: number | null;
	market_price: number | null;
	card_name: string;
	card_text: string | null;
	rarity: string | null;
	card_type: string | null;
	don_id: string | null;
	date_scraped: string;
	card_image_id: string;
	card_image: string;
	optcg_don_name: string | null;
};

export type OptcgDonCard = {
	cardImageId: string;
	name: string;
	fullName: string | null;
	text: string | null;
	rarity: string | null;
	cardType: string | null;
	donId: string | null;
	inventoryPrice: number | null;
	marketPrice: number | null;
	imageUrl: string;
	dateScraped: string;
};

export async function listAllOptcgDonCards(): Promise<OptcgDonCard[]> {
	const url = `${OPTCG_API_BASE}/allDonCards/`;
	const response = await fetch(url, {
		headers: { accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`OPTCG API request failed with ${response.status}.`);
	}
	const data = (await response.json()) as OptcgDonCardRaw[] | { error: string };
	if (!Array.isArray(data)) {
		throw new Error(data.error || "OPTCG returned no DON!! cards.");
	}
	return data.map(toDonCard);
}

export function toDonCard(raw: OptcgDonCardRaw): OptcgDonCard {
	return {
		cardImageId: raw.card_image_id,
		name: raw.card_name,
		fullName: raw.optcg_don_name,
		text: raw.card_text,
		rarity: raw.rarity,
		cardType: raw.card_type,
		donId: raw.don_id,
		inventoryPrice: raw.inventory_price,
		marketPrice: raw.market_price,
		imageUrl: raw.card_image,
		dateScraped: raw.date_scraped,
	};
}
