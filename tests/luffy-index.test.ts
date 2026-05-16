import assert from "node:assert/strict";
import test from "node:test";
import {
	buildLuffyIndex,
	classifyLuffyVariant,
	isLuffyCard,
	type LuffyIndexSourceCard,
	summarizeLuffyIndex,
} from "../src/lib/luffy-index.js";

function makeCard(
	overrides: Partial<LuffyIndexSourceCard> = {},
): LuffyIndexSourceCard {
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

test("isLuffyCard matches Monkey.D.Luffy variants", () => {
	assert.ok(isLuffyCard("Monkey.D.Luffy (003)"));
	assert.ok(isLuffyCard("Monkey.D.Luffy (118) (Red Super Alternate Art)"));
	assert.ok(isLuffyCard("Monkey D. Luffy"));
	assert.ok(isLuffyCard("MONKEY.D.LUFFY"));
	assert.ok(isLuffyCard("Luffy"));
	assert.ok(!isLuffyCard("Roronoa Zoro"));
	assert.ok(!isLuffyCard("Fluffy the Tortoise"));
});

test("classifyLuffyVariant identifies suffixes", () => {
	assert.equal(classifyLuffyVariant("OP01-003", "OP01-003"), "base");
	assert.equal(classifyLuffyVariant("OP01-003_p1", "OP01-003"), "parallel");
	assert.equal(classifyLuffyVariant("OP01-003_alt", "OP01-003"), "alt-art");
	assert.equal(classifyLuffyVariant("OP05-119_r2", "OP05-119"), "alt-art");
	assert.equal(classifyLuffyVariant("OP01-003_promo", "OP01-003"), "promo");
});

test("buildLuffyIndex filters to Luffy cards with positive market price", () => {
	const cards: LuffyIndexSourceCard[] = [
		makeCard({ card_image_id: "OP01-003", market_price: 12.55 }),
		makeCard({
			card_image_id: "OP01-003_p1",
			card_name: "Monkey.D.Luffy (003) (Parallel)",
			market_price: 355.88,
		}),
		makeCard({ card_image_id: "OP01-024", card_name: "Roronoa Zoro", market_price: 5 }),
		makeCard({ card_image_id: "OP05-119_zero", market_price: 0 }),
		makeCard({ card_image_id: "OP05-119_null", market_price: null }),
	];
	const entries = buildLuffyIndex(cards);
	assert.equal(entries.length, 2);
	// Sorted by market price desc
	assert.equal(entries[0].variantId, "OP01-003_p1");
	assert.equal(entries[0].variant, "parallel");
	assert.equal(entries[1].variantId, "OP01-003");
});

test("buildLuffyIndex weights sum to 1 (within float epsilon)", () => {
	const cards = [
		makeCard({ card_image_id: "a", market_price: 100 }),
		makeCard({ card_image_id: "b", market_price: 200 }),
		makeCard({ card_image_id: "c", market_price: 300 }),
	];
	const entries = buildLuffyIndex(cards);
	const sum = entries.reduce((s, e) => s + e.weight, 0);
	assert.ok(Math.abs(sum - 1) < 1e-9, `sum=${sum}`);
	assert.ok(Math.abs(entries[0].weight - 0.5) < 1e-9); // 300/600
});

test("buildLuffyIndex handles all-zero (no qualifying cards)", () => {
	const entries = buildLuffyIndex([]);
	assert.equal(entries.length, 0);
});

test("summarizeLuffyIndex computes totals and top holdings", () => {
	const cards = [
		makeCard({ card_image_id: "a", market_price: 100 }),
		makeCard({ card_image_id: "b", market_price: 200, set_id: "OP-02", set_name: "Paramount War" }),
		makeCard({ card_image_id: "c", market_price: 300, set_id: "OP-02", set_name: "Paramount War" }),
	];
	const entries = buildLuffyIndex(cards);
	const summary = summarizeLuffyIndex(entries, 2);
	assert.equal(summary.holdings, 3);
	assert.equal(summary.totalMarketValue, 600);
	assert.equal(summary.averagePrice, 200);
	assert.equal(summary.medianPrice, 200);
	assert.equal(summary.maxPrice, 300);
	assert.equal(summary.topHoldings.length, 2);
	assert.equal(summary.topHoldings[0].variantId, "c");

	// Set distribution sorted by market value desc
	assert.equal(summary.setDistribution[0].setId, "OP-02");
	assert.equal(summary.setDistribution[0].count, 2);
	assert.equal(summary.setDistribution[0].marketValue, 500);
	assert.equal(summary.setDistribution[1].setId, "OP-01");
});

test("summarizeLuffyIndex handles empty entries", () => {
	const summary = summarizeLuffyIndex([]);
	assert.equal(summary.holdings, 0);
	assert.equal(summary.totalMarketValue, 0);
	assert.equal(summary.maxPrice, 0);
	assert.equal(summary.medianPrice, 0);
	assert.deepEqual(summary.topHoldings, []);
});

test("summarizeLuffyIndex computes median for even-length lists", () => {
	const cards = [
		makeCard({ card_image_id: "a", market_price: 10 }),
		makeCard({ card_image_id: "b", market_price: 20 }),
		makeCard({ card_image_id: "c", market_price: 30 }),
		makeCard({ card_image_id: "d", market_price: 40 }),
	];
	const summary = summarizeLuffyIndex(buildLuffyIndex(cards));
	// Median of [10, 20, 30, 40] = 25
	assert.equal(summary.medianPrice, 25);
});
