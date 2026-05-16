export const OPTCG_API_BASE = "https://optcgapi.com/api";

export type OptcgRawSet = {
	set_id: string;
	set_name: string;
};

export type OptcgSet = {
	setId: string;
	setName: string;
};

export async function listAllOptcgSets(): Promise<OptcgSet[]> {
	const url = `${OPTCG_API_BASE}/allSets/`;
	const response = await fetch(url, {
		headers: { accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`OPTCG API request failed with ${response.status}.`);
	}
	const data = (await response.json()) as OptcgRawSet[] | { error: string };
	if (!Array.isArray(data)) {
		throw new Error(data.error || "OPTCG returned no sets.");
	}
	return data.map(toSet);
}

export function toSet(raw: OptcgRawSet): OptcgSet {
	return { setId: raw.set_id, setName: raw.set_name };
}

export function latestOptcgSet(sets: OptcgSet[]): OptcgSet | null {
	if (sets.length === 0) return null;
	return sets[sets.length - 1];
}
