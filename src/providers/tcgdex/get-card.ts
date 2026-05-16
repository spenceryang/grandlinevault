export const TCGDEX_API_BASE = "https://api.tcgdex.net/v2";
export const TCGDEX_DEFAULT_LANGUAGE = "en";

export type TcgdexLanguage =
	| "en"
	| "fr"
	| "es"
	| "de"
	| "it"
	| "pt"
	| "pt-br"
	| "pl"
	| "ja"
	| "ko"
	| "zh-cn"
	| "zh-tw"
	| "id"
	| "th";

export type TcgdexCardSummary = {
	id: string;
	localId: string;
	name: string;
	image: string | null;
};

export type TcgdexCardRaw = {
	category?: string;
	id: string;
	localId: string;
	name: string;
	illustrator?: string;
	image?: string;
	rarity?: string;
	set?: {
		id: string;
		name: string;
		logo?: string;
		symbol?: string;
		cardCount?: { official?: number; total?: number };
	};
	variants?: {
		firstEdition?: boolean;
		holo?: boolean;
		normal?: boolean;
		reverse?: boolean;
		wPromo?: boolean;
	};
	hp?: number;
	types?: string[];
	evolveFrom?: string;
	stage?: string;
	attacks?: Array<{
		name: string;
		cost?: string[];
		damage?: number | string;
		effect?: string;
	}>;
	weaknesses?: Array<{ type: string; value: string }>;
	resistances?: Array<{ type: string; value: string }>;
	retreat?: number;
	regulationMark?: string;
	dexId?: number[];
};

export type TcgdexCard = {
	id: string;
	localId: string;
	name: string;
	category: string | null;
	illustrator: string | null;
	rarity: string | null;
	imageUrl: string | null;
	hp: number | null;
	types: string[];
	retreat: number | null;
	regulationMark: string | null;
	nationalDexNumbers: number[];
	evolveFrom: string | null;
	stage: string | null;
	setId: string | null;
	setName: string | null;
	attacks: Array<{
		name: string;
		cost: string[];
		damage: string | null;
		effect: string | null;
	}>;
	weaknesses: Array<{ type: string; value: string }>;
	resistances: Array<{ type: string; value: string }>;
	variants: {
		firstEdition: boolean;
		holo: boolean;
		normal: boolean;
		reverse: boolean;
		wPromo: boolean;
	};
};

async function fetchJson<T>(
	path: string,
	language: TcgdexLanguage,
): Promise<T> {
	const url = `${TCGDEX_API_BASE}/${language}${path}`;
	const response = await fetch(url, {
		headers: { accept: "application/json" },
	});
	if (response.status === 404) {
		throw new Error(`TCGdex resource not found: ${path}`);
	}
	if (!response.ok) {
		throw new Error(`TCGdex API request failed with ${response.status}.`);
	}
	return (await response.json()) as T;
}

export async function getTcgdexCard(
	cardId: string,
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<TcgdexCard> {
	const id = cardId.trim();
	if (!id) {
		throw new Error("cardId must not be empty.");
	}
	const raw = await fetchJson<TcgdexCardRaw>(
		`/cards/${encodeURIComponent(id)}`,
		language,
	);
	return toCard(raw);
}

export async function listTcgdexCards(
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<TcgdexCardSummary[]> {
	const raw = await fetchJson<TcgdexCardSummary[]>(`/cards`, language);
	return raw.map(toCardSummary);
}

export async function searchTcgdexCardsByName(
	query: string,
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<TcgdexCardSummary[]> {
	const q = query.trim();
	if (!q) {
		throw new Error("query must not be empty.");
	}
	const raw = await fetchJson<TcgdexCardSummary[]>(
		`/cards?name=${encodeURIComponent(q)}`,
		language,
	);
	return raw.map(toCardSummary);
}

export function toCardSummary(raw: TcgdexCardSummary): TcgdexCardSummary {
	return {
		id: raw.id,
		localId: raw.localId,
		name: raw.name,
		image: raw.image ?? null,
	};
}

export function toCard(raw: TcgdexCardRaw): TcgdexCard {
	return {
		id: raw.id,
		localId: raw.localId,
		name: raw.name,
		category: raw.category ?? null,
		illustrator: raw.illustrator ?? null,
		rarity: raw.rarity ?? null,
		imageUrl: raw.image ?? null,
		hp: raw.hp ?? null,
		types: raw.types ?? [],
		retreat: raw.retreat ?? null,
		regulationMark: raw.regulationMark ?? null,
		nationalDexNumbers: raw.dexId ?? [],
		evolveFrom: raw.evolveFrom ?? null,
		stage: raw.stage ?? null,
		setId: raw.set?.id ?? null,
		setName: raw.set?.name ?? null,
		attacks: (raw.attacks ?? []).map((a) => ({
			name: a.name,
			cost: a.cost ?? [],
			damage:
				a.damage === undefined || a.damage === null ? null : String(a.damage),
			effect: a.effect ?? null,
		})),
		weaknesses: raw.weaknesses ?? [],
		resistances: raw.resistances ?? [],
		variants: {
			firstEdition: raw.variants?.firstEdition ?? false,
			holo: raw.variants?.holo ?? false,
			normal: raw.variants?.normal ?? false,
			reverse: raw.variants?.reverse ?? false,
			wPromo: raw.variants?.wPromo ?? false,
		},
	};
}
