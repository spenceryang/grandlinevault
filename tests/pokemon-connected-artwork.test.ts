import assert from "node:assert/strict";
import test from "node:test";
import {
	buildOwnershipRows,
	type ConnectedArtworkSet,
	findIncompleteSets,
	summarizeConnectedArtworkSets,
} from "../src/lib/pokemon-connected-artwork.js";
import {
	getPokemonConnectedArtworkSeed,
	getPokemonConnectedArtworkSets,
} from "../src/data/pokemon-connected-artwork-seed.js";

const trioSet: ConnectedArtworkSet = {
	id: "test-trio",
	title: "Eevee Trio",
	series: "Evolving Skies",
	setId: "swsh7",
	cards: [
		{ cardId: "swsh7-A", position: 1, name: "Eevee" },
		{ cardId: "swsh7-B", position: 2, name: "Vaporeon" },
		{ cardId: "swsh7-C", position: 3, name: "Leafeon" },
	],
};

const pairSet: ConnectedArtworkSet = {
	id: "test-pair",
	title: "Mew Pair",
	series: "Fusion Strike",
	setId: "swsh8",
	cards: [
		{ cardId: "swsh8-A", position: 1, name: "Mew V" },
		{ cardId: "swsh8-B", position: 2, name: "Mewtwo V" },
	],
};

test("buildOwnershipRows produces one row per (set, card) sorted by set+position", () => {
	const rows = buildOwnershipRows(
		[pairSet, trioSet],
		new Set(["swsh7-A", "swsh8-B"]),
	);
	assert.equal(rows.length, 5);
	// Sorted by title — Eevee Trio comes before Mew Pair
	assert.equal(rows[0].setTitle, "Eevee Trio");
	assert.equal(rows[0].position, 1);
	assert.equal(rows[0].owned, true);
	assert.equal(rows[1].owned, false);
	assert.equal(rows[2].owned, false);
	assert.equal(rows[3].setTitle, "Mew Pair");
	assert.equal(rows[4].owned, true);
});

test("buildOwnershipRows is case-insensitive on owned ids", () => {
	const rows = buildOwnershipRows([pairSet], new Set(["SWSH8-a"]));
	assert.equal(rows[0].owned, true);
});

test("summarizeConnectedArtworkSets reports per-set totals + completion", () => {
	const summaries = summarizeConnectedArtworkSets(
		[trioSet, pairSet],
		new Set(["swsh7-A", "swsh7-B", "swsh7-C", "swsh8-A"]),
	);
	const trio = summaries.find((s) => s.id === "test-trio");
	const pair = summaries.find((s) => s.id === "test-pair");
	assert.equal(trio?.totalCards, 3);
	assert.equal(trio?.ownedCards, 3);
	assert.equal(trio?.completionFraction, 1);
	assert.equal(trio?.complete, true);
	assert.deepEqual(trio?.missingCardIds, []);
	assert.equal(pair?.ownedCards, 1);
	assert.equal(pair?.complete, false);
	assert.deepEqual(pair?.missingCardIds, ["swsh8-B"]);
});

test("summarizeConnectedArtworkSets sorts by completion fraction desc", () => {
	const summaries = summarizeConnectedArtworkSets(
		[pairSet, trioSet],
		new Set(["swsh7-A", "swsh7-B", "swsh7-C"]),
	);
	assert.equal(summaries[0].id, "test-trio"); // 100%
	assert.equal(summaries[1].id, "test-pair"); // 0%
});

test("findIncompleteSets filters by completion threshold", () => {
	const incomplete = findIncompleteSets(
		[trioSet, pairSet],
		new Set(["swsh7-A", "swsh7-B", "swsh7-C"]),
	);
	assert.equal(incomplete.length, 1);
	assert.equal(incomplete[0].id, "test-pair");
});

test("findIncompleteSets returns all sets when threshold is 1 and none complete", () => {
	const incomplete = findIncompleteSets([trioSet, pairSet], new Set());
	assert.equal(incomplete.length, 2);
});

test("seed JSON is well-formed", () => {
	const seed = getPokemonConnectedArtworkSeed();
	assert.ok(seed.seededAt);
	assert.ok(seed.note);
	assert.ok(Array.isArray(seed.sets));
	assert.ok(seed.sets.length > 0);
	for (const set of seed.sets) {
		assert.ok(set.id);
		assert.ok(set.title);
		assert.ok(Array.isArray(set.cards));
		assert.ok(set.cards.length >= 2, `${set.id} should have at least 2 cards`);
	}
});

test("getPokemonConnectedArtworkSets returns at least 3 placeholder sets", () => {
	const sets = getPokemonConnectedArtworkSets();
	assert.ok(sets.length >= 3);
});

test("summarizeConnectedArtworkSets handles empty owned set", () => {
	const summaries = summarizeConnectedArtworkSets([trioSet], new Set());
	assert.equal(summaries[0].completionFraction, 0);
	assert.equal(summaries[0].complete, false);
});
