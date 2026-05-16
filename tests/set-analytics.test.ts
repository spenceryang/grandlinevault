import assert from "node:assert/strict";
import test from "node:test";
import {
	type AnalyticsInputCard,
	summarizeColorBreakdown,
	summarizeRarityBreakdown,
	summarizeSetCompletion,
	topMostValuableCards,
} from "../src/lib/set-analytics.js";

function makeCard(overrides: Partial<AnalyticsInputCard>): AnalyticsInputCard {
	return {
		variantId: "OP01-001",
		baseCardId: "OP01-001",
		name: "Roronoa Zoro",
		setId: "OP-01",
		setName: "Romance Dawn",
		rarity: "L",
		color: "Red",
		cardType: "Leader",
		variant: "base",
		imageUrl: "https://optcgapi.com/img.jpg",
		owned: false,
		marketPrice: 2.97,
		...overrides,
	};
}

test("summarizeSetCompletion buckets cards by setId and computes ownership", () => {
	const cards = [
		makeCard({ variantId: "OP01-001", setId: "OP-01", owned: true }),
		makeCard({
			variantId: "OP01-001_p1",
			setId: "OP-01",
			variant: "parallel",
			marketPrice: 556,
			owned: false,
		}),
		makeCard({
			variantId: "OP02-001",
			setId: "OP-02",
			setName: "Paramount War",
			owned: true,
		}),
	];
	const rows = summarizeSetCompletion(cards);
	const op01 = rows.find((r) => r.setId === "OP-01");
	const op02 = rows.find((r) => r.setId === "OP-02");
	assert.equal(op01?.totalCards, 2);
	assert.equal(op01?.owned, 1);
	assert.equal(op01?.completionFraction, 0.5);
	assert.equal(op01?.baseTotal, 1);
	assert.equal(op01?.baseOwned, 1);
	assert.equal(op01?.parallelTotal, 1);
	assert.equal(op01?.parallelOwned, 0);
	assert.equal(op01?.totalMarketValue, 558.97);
	assert.equal(op01?.ownedMarketValue, 2.97);
	assert.equal(op02?.completionFraction, 1);
});

test("summarizeSetCompletion sorts by completion fraction desc", () => {
	const cards = [
		makeCard({ variantId: "a", setId: "S-50", owned: false }),
		makeCard({ variantId: "b", setId: "S-100", owned: true }),
	];
	const rows = summarizeSetCompletion(cards);
	assert.equal(rows[0].setId, "S-100");
	assert.equal(rows[1].setId, "S-50");
});

test("summarizeRarityBreakdown groups by rarity and sums values", () => {
	const cards = [
		makeCard({ variantId: "a", rarity: "L", marketPrice: 3, owned: true }),
		makeCard({ variantId: "b", rarity: "SR", marketPrice: 10, owned: false }),
		makeCard({ variantId: "c", rarity: "SR", marketPrice: 5, owned: true }),
	];
	const rows = summarizeRarityBreakdown(cards);
	assert.equal(rows[0].rarity, "SR");
	assert.equal(rows[0].count, 2);
	assert.equal(rows[0].owned, 1);
	assert.equal(rows[0].totalMarketValue, 15);
	assert.equal(rows[0].ownedMarketValue, 5);
});

test("summarizeColorBreakdown groups by color", () => {
	const cards = [
		makeCard({ variantId: "a", color: "Red", owned: true }),
		makeCard({ variantId: "b", color: "Blue", owned: false }),
		makeCard({ variantId: "c", color: "Red", owned: false }),
	];
	const rows = summarizeColorBreakdown(cards);
	assert.equal(rows[0].color, "Red");
	assert.equal(rows[0].count, 2);
	assert.equal(rows[0].owned, 1);
});

test("topMostValuableCards returns top N sorted by market price desc", () => {
	const cards = [
		makeCard({ variantId: "a", marketPrice: 5 }),
		makeCard({ variantId: "b", marketPrice: 500 }),
		makeCard({ variantId: "c", marketPrice: 50 }),
		makeCard({ variantId: "d", marketPrice: null }),
		makeCard({ variantId: "e", marketPrice: 0 }),
	];
	const top = topMostValuableCards(cards, 2);
	assert.equal(top.length, 2);
	assert.equal(top[0].cardImageId, "b");
	assert.equal(top[0].marketPrice, 500);
	assert.equal(top[1].cardImageId, "c");
});

test("topMostValuableCards drops null/zero prices", () => {
	const cards = [
		makeCard({ variantId: "a", marketPrice: 0 }),
		makeCard({ variantId: "b", marketPrice: null }),
		makeCard({ variantId: "c", marketPrice: 1 }),
	];
	const top = topMostValuableCards(cards, 10);
	assert.equal(top.length, 1);
	assert.equal(top[0].cardImageId, "c");
});

test("summarizeSetCompletion handles cards with null setId", () => {
	const cards = [makeCard({ setId: null, owned: false })];
	const rows = summarizeSetCompletion(cards);
	assert.equal(rows[0].setId, "UNKNOWN");
});
