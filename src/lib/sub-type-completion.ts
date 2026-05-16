export const OPTCG_KNOWN_SUB_TYPES: ReadonlyArray<string> = [
	// Crews and pirate factions
	"Straw Hat Crew",
	"Heart Pirates",
	"Whitebeard Pirates",
	"Animal Kingdom Pirates",
	"Big Mom Pirates",
	"Blackbeard Pirates",
	"Donquixote Pirates",
	"Kid Pirates",
	"Roger Pirates",
	"Buggy Pirates",
	"Foxy Pirates",
	"Thriller Bark Pirates",
	"Red Hair Pirates",
	"Beast Pirates",
	"Hawkins Pirates",
	"Drake Pirates",
	"Bonney Pirates",
	"Krieg Pirates",
	"Arlong Pirates",

	// Marines / government
	"Marine",
	"Navy",
	"World Government",
	"CP",
	"Impel Down",
	"Seven Warlords of the Sea",

	// Themed sub-types
	"Supernovas",
	"Worst Generation",
	"Revolutionary Army",
	"Yonko",
	"Baroque Works",

	// Regions
	"East Blue",
	"South Blue",
	"North Blue",
	"West Blue",
	"Grand Line",
	"Sky Island",
	"Skypiea",
	"Wano Country",
	"Punk Hazard",
	"Dressrosa",
	"Whole Cake Island",
	"Egghead",

	// Species / character types
	"Fish-Man",
	"Mink",
	"Animal",
	"Giant",
	"Dwarf",
	"Lunarian",
];

export type SubTypeCardInput = {
	cardSetId: string;
	cardImageId: string;
	name: string;
	subTypes: string | null;
};

export type SubTypeCompletionRow = {
	subType: string;
	total: number;
	owned: number;
	completionFraction: number;
	missingCardIds: string[];
};

export function extractSubTypes(
	value: string | null,
	dictionary: ReadonlyArray<string> = OPTCG_KNOWN_SUB_TYPES,
): string[] {
	if (!value) return [];
	const sortedDict = dictionary
		.slice()
		.sort((a, b) => b.length - a.length);
	let remaining = value;
	const found: string[] = [];
	for (const term of sortedDict) {
		if (remaining.includes(term)) {
			found.push(term);
			remaining = remaining.replace(term, " ").replace(/\s+/g, " ");
		}
	}
	const residual = remaining
		.split(/\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	return [...found, ...residual];
}

export function buildSubTypeCompletion(
	cards: ReadonlyArray<SubTypeCardInput>,
	ownedIds: ReadonlySet<string>,
	dictionary: ReadonlyArray<string> = OPTCG_KNOWN_SUB_TYPES,
): SubTypeCompletionRow[] {
	const normalizedOwned = new Set<string>();
	for (const id of ownedIds) normalizedOwned.add(id.trim().toUpperCase());

	const bySubType = new Map<
		string,
		{ total: number; owned: number; missingCardIds: string[] }
	>();

	for (const card of cards) {
		const tags = extractSubTypes(card.subTypes, dictionary);
		if (tags.length === 0) continue;
		const isOwned =
			normalizedOwned.has(card.cardImageId.toUpperCase()) ||
			normalizedOwned.has(card.cardSetId.toUpperCase());
		for (const tag of tags) {
			const existing = bySubType.get(tag);
			if (existing) {
				existing.total += 1;
				if (isOwned) existing.owned += 1;
				else existing.missingCardIds.push(card.cardImageId);
			} else {
				bySubType.set(tag, {
					total: 1,
					owned: isOwned ? 1 : 0,
					missingCardIds: isOwned ? [] : [card.cardImageId],
				});
			}
		}
	}

	return Array.from(bySubType.entries())
		.map(([subType, info]) => ({
			subType,
			total: info.total,
			owned: info.owned,
			completionFraction: info.total === 0 ? 0 : info.owned / info.total,
			missingCardIds: info.missingCardIds,
		}))
		.sort((a, b) => b.total - a.total);
}
