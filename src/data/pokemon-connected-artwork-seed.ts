import seed from "./pokemon-connected-artwork-seed.json" with { type: "json" };
import type { ConnectedArtworkSet } from "../lib/pokemon-connected-artwork.js";

export type ConnectedArtworkSeed = {
	seededAt: string;
	note: string;
	sets: ConnectedArtworkSet[];
};

export function getPokemonConnectedArtworkSeed(): ConnectedArtworkSeed {
	return seed as ConnectedArtworkSeed;
}

export function getPokemonConnectedArtworkSets(): ConnectedArtworkSet[] {
	return getPokemonConnectedArtworkSeed().sets;
}
