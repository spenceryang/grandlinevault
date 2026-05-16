export type PokemonCardSeed = {
	id: string;
	localId: string | null;
	name: string;
	image: string | null;
};

export type PokemonMasterSetEntry = {
	character: string;
	cardId: string;
	localId: string | null;
	name: string;
	colorImageUrl: string | null;
	greyscaleImageUrl: string | null;
	owned: boolean;
};

export type PokemonMasterSetSummary = {
	character: string;
	totalCards: number;
	ownedCards: number;
	completionFraction: number;
	missingCount: number;
};

export const SUPPORTED_POKEMON_CHARACTERS = [
	"Charizard",
	"Gengar",
	"Pikachu",
	"Togekiss",
] as const;

export type SupportedPokemonCharacter =
	(typeof SUPPORTED_POKEMON_CHARACTERS)[number];

export const WSRV_GREYSCALE_BASE = "https://wsrv.nl/";

export function toGreyscaleImageUrl(imageUrl: string | null): string | null {
	if (!imageUrl) return null;
	const trimmed = imageUrl.trim();
	if (!trimmed) return null;
	return `${WSRV_GREYSCALE_BASE}?url=${encodeURIComponent(trimmed)}&filt=greyscale&output=jpg`;
}

export function buildPokemonMasterSetEntries(
	character: string,
	cards: ReadonlyArray<PokemonCardSeed>,
	ownedIds: ReadonlySet<string>,
): PokemonMasterSetEntry[] {
	const normalized = new Set<string>();
	for (const id of ownedIds) normalized.add(id.trim().toUpperCase());

	const entries = cards.map((card) => {
		const colorBase = card.image
			? `${card.image}/high.jpg`
			: null;
		const owned = normalized.has(card.id.toUpperCase());
		return {
			character,
			cardId: card.id,
			localId: card.localId,
			name: card.name,
			colorImageUrl: colorBase,
			greyscaleImageUrl: toGreyscaleImageUrl(colorBase),
			owned,
		};
	});

	entries.sort((a, b) => {
		if (a.character !== b.character) {
			return a.character.localeCompare(b.character);
		}
		const aSet = a.cardId.split("-")[0] ?? "";
		const bSet = b.cardId.split("-")[0] ?? "";
		if (aSet !== bSet) return aSet.localeCompare(bSet);
		const aLocal = Number(a.localId) || 0;
		const bLocal = Number(b.localId) || 0;
		return aLocal - bLocal;
	});

	return entries;
}

export function summarizePokemonMasterSet(
	character: string,
	entries: ReadonlyArray<PokemonMasterSetEntry>,
): PokemonMasterSetSummary {
	const matched = entries.filter((e) => e.character === character);
	const totalCards = matched.length;
	const ownedCards = matched.filter((e) => e.owned).length;
	const completionFraction =
		totalCards === 0 ? 0 : ownedCards / totalCards;
	return {
		character,
		totalCards,
		ownedCards,
		completionFraction,
		missingCount: totalCards - ownedCards,
	};
}
