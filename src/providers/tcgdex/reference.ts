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

async function fetchStringList(
	path: string,
	language: TcgdexLanguage,
): Promise<string[]> {
	const url = `${TCGDEX_API_BASE}/${language}${path}`;
	const response = await fetch(url, {
		headers: { accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`TCGdex API request failed with ${response.status}.`);
	}
	const data = (await response.json()) as string[] | { error: string };
	if (!Array.isArray(data)) {
		throw new Error(
			(data && (data as { error?: string }).error) ||
				"TCGdex returned an unexpected response.",
		);
	}
	return data;
}

export async function listTcgdexTypes(
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<string[]> {
	return fetchStringList(`/types`, language);
}

export async function listTcgdexRarities(
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<string[]> {
	return fetchStringList(`/rarities`, language);
}

export async function listTcgdexCategories(
	language: TcgdexLanguage = TCGDEX_DEFAULT_LANGUAGE,
): Promise<string[]> {
	return fetchStringList(`/categories`, language);
}
