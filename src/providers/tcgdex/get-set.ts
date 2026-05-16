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

export type TcgdexSetSummary = {
	id: string;
	name: string;
	logo: string | null;
	symbol: string | null;
	cardCount: {
		total: number;
		official: number;
	};
};

export type TcgdexSetSummaryRaw = {
	id: string;
	name: string;
	logo?: string;
	symbol?: string;
	cardCount: {
		total: number;
		official: number;
	};
};

export type TcgdexSetCardRaw = {
	id: string;
	localId: string;
	name: string;
	image?: string;
};

export type TcgdexSetRaw = {
	id: string;
	name: string;
	logo?: string;
	symbol?: string;
	serie?: { id: string; name: string };
	tcgOnline?: string;
	releaseDate?: string;
	legal?: { standard?: boolean; expanded?: boolean };
	cardCount: {
		total: number;
		official: number;
		firstEd?: number;
		holo?: number;
		normal?: number;
		reverse?: number;
	};
	cards: TcgdexSetCardRaw[];
};

export type TcgdexSet = {
	id: string;
	name: string;
	logo: string | null;
	symbol: string | null;
	seriesId: string | null;
	seriesName: string | null;
	releaseDate: string | null;
	legalStandard: boolean;
	legalExpanded: boolean;
	cardCount: {
		total: number;
		official: number;
		firstEd: number | null;
		holo: number | null;
		normal: number | null;
		reverse: number | null;
	};
	cards: Array<{
		id: string;
		localId: string;
		name: string;
		imageUrl: string | null;
	}>;
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

export async function getTcgdexSet(
	setId: string,
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<TcgdexSet> {
	const id = setId.trim();
	if (!id) {
		throw new Error("setId must not be empty.");
	}
	const raw = await fetchJson<TcgdexSetRaw>(
		`/sets/${encodeURIComponent(id)}`,
		language,
	);
	return toSet(raw);
}

export async function listTcgdexSets(
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<TcgdexSetSummary[]> {
	const raw = await fetchJson<TcgdexSetSummaryRaw[]>(`/sets`, language);
	return raw.map(toSetSummary);
}

export function toSetSummary(raw: TcgdexSetSummaryRaw): TcgdexSetSummary {
	return {
		id: raw.id,
		name: raw.name,
		logo: raw.logo ?? null,
		symbol: raw.symbol ?? null,
		cardCount: {
			total: raw.cardCount.total,
			official: raw.cardCount.official,
		},
	};
}

export function toSet(raw: TcgdexSetRaw): TcgdexSet {
	return {
		id: raw.id,
		name: raw.name,
		logo: raw.logo ?? null,
		symbol: raw.symbol ?? null,
		seriesId: raw.serie?.id ?? null,
		seriesName: raw.serie?.name ?? null,
		releaseDate: raw.releaseDate ?? null,
		legalStandard: raw.legal?.standard ?? false,
		legalExpanded: raw.legal?.expanded ?? false,
		cardCount: {
			total: raw.cardCount.total,
			official: raw.cardCount.official,
			firstEd: raw.cardCount.firstEd ?? null,
			holo: raw.cardCount.holo ?? null,
			normal: raw.cardCount.normal ?? null,
			reverse: raw.cardCount.reverse ?? null,
		},
		cards: raw.cards.map((c) => ({
			id: c.id,
			localId: c.localId,
			name: c.name,
			imageUrl: c.image ?? null,
		})),
	};
}
