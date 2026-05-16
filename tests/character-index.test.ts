import assert from "node:assert/strict";
import test from "node:test";
import {
	buildAllRegisteredIndices,
	buildCharacterIndex,
	CHARACTER_INDEX_REGISTRY,
	DONQUIXOTE_PATTERNS,
	LUFFY_PATTERNS,
	matchesAnyPattern,
	type CharacterIndexSourceCard,
	STRAWHAT_PATTERNS,
	summarizeCharacterIndex,
	YONKO_PATTERNS,
	ZORO_PATTERNS,
} from "../src/lib/character-index.js";

function card(
	overrides: Partial<CharacterIndexSourceCard> = {},
): CharacterIndexSourceCard {
	return {
		card_set_id: "OP01-003",
		card_image_id: "OP01-003",
		card_name: "Monkey.D.Luffy (003)",
		set_id: "OP-01",
		set_name: "Romance Dawn",
		rarity: "L",
		card_color: "Red",
		card_type: "Leader",
		card_image: "https://optcgapi.com/img.jpg",
		market_price: 12.55,
		...overrides,
	};
}

test("Luffy patterns match canonical naming variants", () => {
	assert.ok(matchesAnyPattern("Monkey.D.Luffy (003)", LUFFY_PATTERNS));
	assert.ok(matchesAnyPattern("Monkey D Luffy", LUFFY_PATTERNS));
	assert.ok(matchesAnyPattern("Luffy", LUFFY_PATTERNS));
	assert.ok(!matchesAnyPattern("Roronoa Zoro", LUFFY_PATTERNS));
});

test("Zoro patterns match Roronoa Zoro forms", () => {
	assert.ok(matchesAnyPattern("Roronoa Zoro (001)", ZORO_PATTERNS));
	assert.ok(matchesAnyPattern("Roronoa.Zoro", ZORO_PATTERNS));
	assert.ok(!matchesAnyPattern("Monkey.D.Luffy", ZORO_PATTERNS));
});

test("Strawhat patterns match every crew member", () => {
	const names = [
		"Monkey.D.Luffy",
		"Roronoa Zoro",
		"Vinsmoke Sanji",
		"Nami",
		"Usopp",
		"Tony Tony Chopper",
		"Nico Robin",
		"Franky",
		"Brook",
		"Jinbei",
	];
	for (const name of names) {
		assert.ok(
			matchesAnyPattern(name, STRAWHAT_PATTERNS),
			`expected Strawhat to match ${name}`,
		);
	}
});

test("Yonko patterns match canonical Yonko-tier captains", () => {
	const names = [
		"Kaido",
		"Big Mom",
		"Charlotte Linlin",
		"Shanks",
		"Blackbeard",
		"Marshall.D.Teach",
		"Whitebeard",
		"Edward Newgate",
		"Monkey.D.Luffy",
	];
	for (const name of names) {
		assert.ok(
			matchesAnyPattern(name, YONKO_PATTERNS),
			`expected Yonko to match ${name}`,
		);
	}
});

test("Donquixote patterns match family members", () => {
	assert.ok(matchesAnyPattern("Donquixote Doflamingo", DONQUIXOTE_PATTERNS));
	assert.ok(matchesAnyPattern("Doflamingo", DONQUIXOTE_PATTERNS));
	assert.ok(matchesAnyPattern("Corazon", DONQUIXOTE_PATTERNS));
});

test("buildCharacterIndex filters and weights matching cards", () => {
	const cards = [
		card({ card_image_id: "OP01-003", market_price: 12 }),
		card({
			card_image_id: "OP01-003_p1",
			card_name: "Monkey.D.Luffy (003) (Parallel)",
			market_price: 355,
		}),
		card({
			card_image_id: "OP01-001",
			card_name: "Roronoa Zoro (001)",
			market_price: 3,
		}),
		card({ card_image_id: "zero", market_price: 0 }),
		card({ card_image_id: "null", market_price: null }),
	];
	const entries = buildCharacterIndex("Luffy", cards, LUFFY_PATTERNS);
	assert.equal(entries.length, 2);
	assert.equal(entries[0].variantId, "OP01-003_p1");
	assert.equal(entries[0].variant, "parallel");
	const sumWeight = entries.reduce((s, e) => s + e.weight, 0);
	assert.ok(Math.abs(sumWeight - 1) < 1e-9);
});

test("summarizeCharacterIndex computes totals + top holdings", () => {
	const entries = buildCharacterIndex(
		"Luffy",
		[
			card({ card_image_id: "a", market_price: 10 }),
			card({ card_image_id: "b", market_price: 20 }),
			card({ card_image_id: "c", market_price: 30 }),
		],
		LUFFY_PATTERNS,
	);
	const summary = summarizeCharacterIndex("Luffy", entries, 2);
	assert.equal(summary.character, "Luffy");
	assert.equal(summary.holdings, 3);
	assert.equal(summary.totalMarketValue, 60);
	assert.equal(summary.averagePrice, 20);
	assert.equal(summary.maxPrice, 30);
	assert.equal(summary.topHoldings.length, 2);
	assert.equal(summary.topHoldings[0].variantId, "c");
});

test("buildAllRegisteredIndices populates every registry key", () => {
	const cards = [
		card({ card_image_id: "luf", market_price: 10 }),
		card({
			card_image_id: "zor",
			card_name: "Roronoa Zoro",
			market_price: 5,
			card_set_id: "zor",
		}),
		card({
			card_image_id: "kaido",
			card_name: "Kaido (The Beast)",
			market_price: 50,
			card_set_id: "kaido",
		}),
	];
	const all = buildAllRegisteredIndices(cards);
	const keys = Object.keys(CHARACTER_INDEX_REGISTRY);
	for (const k of keys) {
		assert.ok(k in all, `missing index for ${k}`);
	}
	assert.ok(all.Luffy.length >= 1);
	assert.ok(all.Zoro.length >= 1);
	assert.ok(all.Yonko.length >= 1);
});
