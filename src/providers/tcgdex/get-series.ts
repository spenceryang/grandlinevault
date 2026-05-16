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

export type TcgdexSeriesSummaryRaw = {
	id: string;
	name: string;
	logo?: string;
};

export type TcgdexSeriesSummary = {
	id: string;
	name: string;
	logo: string | null;
};

export type TcgdexSeriesSetRaw = {
	id: string;
	name: string;
	logo?: string;
	symbol?: string;
	cardCount: {
		total: number;
		official: number;
	};
};

export type TcgdexSeriesRaw = {
	id: string;
	name: string;
	logo?: string;
	releaseDate?: string;
	firstSet?: TcgdexSeriesSetRaw;
	lastSet?: TcgdexSeriesSetRaw;
	sets?: TcgdexSeriesSetRaw[];
};

export type TcgdexSeriesSet = {
	id: string;
	name: string;
	logo: string | null;
	symbol: string | null;
	cardCount: {
		total: number;
		official: number;
	};
};

export type TcgdexSeries = {
	id: string;
	name: string;
	logo: string | null;
	releaseDate: string | null;
	firstSet: TcgdexSeriesSet | null;
	lastSet: TcgdexSeriesSet | null;
	sets: TcgdexSeriesSet[];
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

export async function getTcgdexSeries(
	seriesId: string,
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<TcgdexSeries> {
	const id = seriesId.trim();
	if (!id) {
		throw new Error("seriesId must not be empty.");
	}
	const raw = await fetchJson<TcgdexSeriesRaw>(
		`/series/${encodeURIComponent(id)}`,
		language,
	);
	return toSeries(raw);
}

export async function listTcgdexSeries(
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<TcgdexSeriesSummary[]> {
	const raw = await fetchJson<TcgdexSeriesSummaryRaw[]>(`/series`, language);
	return raw.map(toSeriesSummary);
}

export function toSeriesSummary(
	raw: TcgdexSeriesSummaryRaw,
): TcgdexSeriesSummary {
	return {
		id: raw.id,
		name: raw.name,
		logo: raw.logo ?? null,
	};
}

export function toSeries(raw: TcgdexSeriesRaw): TcgdexSeries {
	return {
		id: raw.id,
		name: raw.name,
		logo: raw.logo ?? null,
		releaseDate: raw.releaseDate ?? null,
		firstSet: raw.firstSet ? toSeriesSet(raw.firstSet) : null,
		lastSet: raw.lastSet ? toSeriesSet(raw.lastSet) : null,
		sets: (raw.sets ?? []).map(toSeriesSet),
	};
}

export function toSeriesSet(raw: TcgdexSeriesSetRaw): TcgdexSeriesSet {
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
