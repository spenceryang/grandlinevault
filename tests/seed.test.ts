import assert from "node:assert/strict";
import test from "node:test";
import { findSeedCard, getSeedLatestSet } from "../src/data/seed.js";

test("getSeedLatestSet returns the bundled OP15-EB04 snapshot", () => {
	const seed = getSeedLatestSet();
	assert.equal(seed.setId, "OP15-EB04");
	assert.equal(seed.setName, "Adventure on Kami's Island");
	assert.equal(seed.cardCount, seed.cards.length);
	assert.ok(seed.cards.length > 0);
});

test("seed cards include image URLs on optcgapi.com", () => {
	const sample = getSeedLatestSet().cards[0];
	assert.ok(sample.card_image.startsWith("https://optcgapi.com/"));
	assert.ok(sample.card_set_id.length > 0);
});

test("findSeedCard locates a card by id (case-insensitive)", () => {
	const sample = getSeedLatestSet().cards[0];
	const match = findSeedCard(sample.card_set_id.toLowerCase());
	assert.equal(match?.card_set_id, sample.card_set_id);
});

test("findSeedCard returns undefined for unknown ids", () => {
	assert.equal(findSeedCard("ZZ99-999"), undefined);
});
