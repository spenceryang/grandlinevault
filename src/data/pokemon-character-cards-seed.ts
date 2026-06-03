import seed from "./pokemon-character-cards-seed.json" with { type: "json" };
import type {
	PokemonCardSeed,
	SupportedPokemonCharacter,
} from "../lib/pokemon-character-master-set.js";

export type PokemonCharacterCardsSeed = {
	seededAt: string;
	source: string;
	characters: Record<SupportedPokemonCharacter, PokemonCardSeed[]>;
};

export function getPokemonCharacterCardsSeed(): PokemonCharacterCardsSeed {
	return seed as PokemonCharacterCardsSeed;
}

export function getCardsForPokemonCharacter(
	character: SupportedPokemonCharacter,
): PokemonCardSeed[] {
	return getPokemonCharacterCardsSeed().characters[character] ?? [];
}
