import seedLatestSet from "./seed-latest-set.json" with { type: "json" };

export type SeedCard = {
	card_set_id: string;
	card_image_id: string;
	card_name: string;
	set_name: string | null;
	set_id: string | null;
	rarity: string | null;
	card_color: string | null;
	card_type: string | null;
	card_cost: string | null;
	card_power: string | null;
	life: string | null;
	counter_amount: number | null;
	sub_types: string | null;
	attribute: string | null;
	card_text: string | null;
	card_image: string;
};

export type SeedSet = {
	setId: string;
	setName: string;
	fetchedAt: string;
	cardCount: number;
	cards: SeedCard[];
};

export function getSeedLatestSet(): SeedSet {
	return seedLatestSet as SeedSet;
}

export function findSeedCard(cardSetId: string): SeedCard | undefined {
	const target = cardSetId.trim().toUpperCase();
	return getSeedLatestSet().cards.find((c) => c.card_set_id === target);
}
