const TCGDEX_API_BASE = "https://api.tcgdex.net/v2/en";

export type PokemonCardSearchResult = {
	id: string;
	localId: string;
	name: string;
	imageUrl: string | null;
	setId: string | null;
	setName: string | null;
	rarity: string | null;
	types: string[];
	hp: number | null;
};

type TcgdexSummary = {
	id: string;
	localId: string;
	name: string;
	image?: string;
};

type TcgdexCard = TcgdexSummary & {
	rarity?: string;
	hp?: number;
	types?: string[];
	set?: { id: string; name: string };
};

export async function searchPokemonCards(
	query: string,
	limit = 16,
): Promise<PokemonCardSearchResult[]> {
	const q = query.trim();
	if (!q) throw new Error("Pokemon search query is required.");
	const response = await fetch(
		`${TCGDEX_API_BASE}/cards?name=${encodeURIComponent(q)}`,
		{ headers: { accept: "application/json" } },
	);
	if (!response.ok) {
		throw new Error(`TCGdex search failed with ${response.status}.`);
	}
	const rows = (await response.json()) as TcgdexSummary[];
	return rows.slice(0, limit).map((row) => ({
		id: row.id,
		localId: row.localId,
		name: row.name,
		imageUrl: normalizeTcgdexImageUrl(row.image),
		setId: setIdFromCardId(row.id),
		setName: null,
		rarity: null,
		types: [],
		hp: null,
	}));
}

export async function getPokemonCard(
	cardId: string,
): Promise<PokemonCardSearchResult> {
	const id = cardId.trim();
	if (!id) throw new Error("Pokemon card id is required.");
	const response = await fetch(`${TCGDEX_API_BASE}/cards/${encodeURIComponent(id)}`, {
		headers: { accept: "application/json" },
	});
	if (response.status === 404) throw new Error(`Pokemon card not found: ${id}`);
	if (!response.ok) throw new Error(`TCGdex card lookup failed with ${response.status}.`);
	const card = (await response.json()) as TcgdexCard;
	return {
		id: card.id,
		localId: card.localId,
		name: card.name,
		imageUrl: normalizeTcgdexImageUrl(card.image),
		setId: card.set?.id ?? setIdFromCardId(card.id),
		setName: card.set?.name ?? null,
		rarity: card.rarity ?? null,
		types: card.types ?? [],
		hp: card.hp ?? null,
	};
}

export function normalizeTcgdexImageUrl(image: string | null | undefined): string | null {
	if (!image) return null;
	if (/\.(png|jpg|jpeg|webp)$/i.test(image)) return image;
	return `${image}/high.png`;
}

function setIdFromCardId(cardId: string): string | null {
	const [setId] = cardId.split("-");
	return setId || null;
}

