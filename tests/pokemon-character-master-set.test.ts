import assert from "node:assert/strict";
import test from "node:test";
import {
	buildPokemonMasterSetEntries,
	type PokemonCardSeed,
	SUPPORTED_POKEMON_CHARACTERS,
	summarizePokemonMasterSet,
	toGreyscaleImageUrl,
} from "../src/lib/pokemon-character-master-set.js";
import {
	getCardsForPokemonCharacter,
	getPokemonCharacterCardsSeed,
} from "../src/data/pokemon-character-cards-seed.js";

const sampleCards: PokemonCardSeed[] = [
	{
		id: "swsh1-1",
		localId: "1",
		name: "Charizard A",
		image: "https://assets.tcgdex.net/en/swsh/swsh1/1",
	},
	{
		id: "swsh1-2",
		localId: "2",
		name: "Charizard B",
		image: "https://assets.tcgdex.net/en/swsh/swsh1/2",
	},
	{
		id: "swsh1-3",
		localId: "3",
		name: "Charizard C",
		image: null,
	},
];

test("toGreyscaleImageUrl wraps the URL in wsrv.nl greyscale proxy", () => {
	const result = toGreyscaleImageUrl(
		"https://assets.tcgdex.net/en/swsh/swsh1/1/high.jpg",
	);
	assert.ok(result?.startsWith("https://wsrv.nl/?url="));
	assert.match(result ?? "", /filt=greyscale/);
	assert.match(result ?? "", /assets\.tcgdex\.net/);
});

test("toGreyscaleImageUrl returns null for empty input", () => {
	assert.equal(toGreyscaleImageUrl(null), null);
	assert.equal(toGreyscaleImageUrl(""), null);
	assert.equal(toGreyscaleImageUrl("   "), null);
});

test("buildPokemonMasterSetEntries builds rows with both color and greyscale URLs", () => {
	const entries = buildPokemonMasterSetEntries(
		"Charizard",
		sampleCards,
		new Set(["swsh1-1"]),
	);
	assert.equal(entries.length, 3);
	const owned = entries.find((e) => e.cardId === "swsh1-1");
	const needed = entries.find((e) => e.cardId === "swsh1-2");
	const noImage = entries.find((e) => e.cardId === "swsh1-3");
	assert.equal(owned?.owned, true);
	assert.ok(owned?.colorImageUrl?.includes("/high.jpg"));
	assert.ok(owned?.greyscaleImageUrl?.includes("wsrv.nl"));
	assert.equal(needed?.owned, false);
	assert.ok(needed?.greyscaleImageUrl?.includes("filt=greyscale"));
	assert.equal(noImage?.colorImageUrl, null);
	assert.equal(noImage?.greyscaleImageUrl, null);
});

test("buildPokemonMasterSetEntries is case-insensitive on owned ids", () => {
	const entries = buildPokemonMasterSetEntries(
		"Charizard",
		sampleCards,
		new Set(["SWSH1-1"]),
	);
	const owned = entries.find((e) => e.cardId === "swsh1-1");
	assert.equal(owned?.owned, true);
});

test("buildPokemonMasterSetEntries sorts by set, then local id ascending", () => {
	const unsorted: PokemonCardSeed[] = [
		{ id: "swsh2-5", localId: "5", name: "B", image: null },
		{ id: "swsh1-10", localId: "10", name: "A10", image: null },
		{ id: "swsh1-2", localId: "2", name: "A2", image: null },
	];
	const entries = buildPokemonMasterSetEntries(
		"Pikachu",
		unsorted,
		new Set(),
	);
	assert.deepEqual(
		entries.map((e) => e.cardId),
		["swsh1-2", "swsh1-10", "swsh2-5"],
	);
});

test("summarizePokemonMasterSet computes per-character completion", () => {
	const entries = buildPokemonMasterSetEntries(
		"Charizard",
		sampleCards,
		new Set(["swsh1-1", "swsh1-2"]),
	);
	const summary = summarizePokemonMasterSet("Charizard", entries);
	assert.equal(summary.character, "Charizard");
	assert.equal(summary.totalCards, 3);
	assert.equal(summary.ownedCards, 2);
	assert.equal(summary.missingCount, 1);
	assert.ok(Math.abs(summary.completionFraction - 2 / 3) < 1e-9);
});

test("SUPPORTED_POKEMON_CHARACTERS includes all four characters", () => {
	assert.deepEqual(
		[...SUPPORTED_POKEMON_CHARACTERS],
		["Charizard", "Gengar", "Pikachu", "Togekiss"],
	);
});

test("seed JSON has cards for every supported character", () => {
	const seed = getPokemonCharacterCardsSeed();
	for (const c of SUPPORTED_POKEMON_CHARACTERS) {
		const cards = seed.characters[c];
		assert.ok(
			Array.isArray(cards) && cards.length > 0,
			`expected seed cards for ${c}`,
		);
	}
});

test("getCardsForPokemonCharacter returns the seeded list", () => {
	const charizards = getCardsForPokemonCharacter("Charizard");
	assert.ok(charizards.length >= 100, `expected 100+ Charizards, got ${charizards.length}`);
	for (const card of charizards) {
		assert.ok(card.id, "every card must have an id");
		assert.equal(typeof card.name, "string");
	}
});
