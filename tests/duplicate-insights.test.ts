import assert from "node:assert/strict";
import test from "node:test";
import type { OwnedCardRecord } from "../src/lib/collection.js";
import {
	enrichDuplicates,
	findTradableDuplicates,
	summarizeDuplicatesByOwner,
} from "../src/lib/duplicate-insights.js";

function owned(overrides: Partial<OwnedCardRecord> = {}): OwnedCardRecord {
	return {
		ownerName: "Spencer",
		cardId: "OP01-003",
		cardName: "Monkey.D.Luffy",
		quantity: 1,
		...overrides,
	};
}

test("enrichDuplicates filters out singletons", () => {
	const cards = [
		owned({ cardId: "A", quantity: 1 }),
		owned({ cardId: "B", quantity: 2 }),
	];
	const enriched = enrichDuplicates(cards);
	assert.equal(enriched.length, 1);
	assert.equal(enriched[0].cardId, "B");
});

test("enrichDuplicates computes availableCount = quantity - 1", () => {
	const enriched = enrichDuplicates([owned({ quantity: 4 })]);
	assert.equal(enriched[0].availableCount, 3);
});

test("enrichDuplicates joins market prices case-insensitively", () => {
	const enriched = enrichDuplicates(
		[owned({ cardId: "op01-003", quantity: 3 })],
		new Map([["OP01-003", 12.5]]),
	);
	assert.equal(enriched[0].currentMarketPrice, 12.5);
	assert.equal(enriched[0].totalValue, 37.5);
	assert.equal(enriched[0].tradeableValue, 25);
});

test("enrichDuplicates leaves prices null when no quote is available", () => {
	const enriched = enrichDuplicates([owned({ quantity: 2 })]);
	assert.equal(enriched[0].currentMarketPrice, null);
	assert.equal(enriched[0].totalValue, null);
	assert.equal(enriched[0].tradeableValue, null);
});

test("enrichDuplicates sorts by tradeable value desc, then available count desc", () => {
	const cards = [
		owned({ cardId: "A", quantity: 5 }),
		owned({ cardId: "B", quantity: 2 }),
		owned({ cardId: "C", quantity: 3 }),
	];
	const prices = new Map([
		["A", 1],
		["B", 100],
		["C", 50],
	]);
	const enriched = enrichDuplicates(cards, prices);
	// tradeableValues: A=4, B=100, C=100. B sorts before C by available count desc (B=1, C=2) → C first
	assert.equal(enriched[0].cardId, "C");
	assert.equal(enriched[1].cardId, "B");
	assert.equal(enriched[2].cardId, "A");
});

test("findTradableDuplicates filters by minAvailable", () => {
	const enriched = enrichDuplicates([
		owned({ cardId: "A", quantity: 2 }),
		owned({ cardId: "B", quantity: 4 }),
		owned({ cardId: "C", quantity: 3 }),
	]);
	const tradable = findTradableDuplicates(enriched, { minAvailable: 2 });
	assert.equal(tradable.length, 2);
	assert.ok(tradable.find((c) => c.cardId === "B"));
	assert.ok(tradable.find((c) => c.cardId === "C"));
});

test("findTradableDuplicates filters by owner", () => {
	const enriched = enrichDuplicates([
		owned({ cardId: "A", quantity: 2, ownerName: "Spencer" }),
		owned({ cardId: "B", quantity: 2, ownerName: "Jarren" }),
	]);
	const sp = findTradableDuplicates(enriched, { ownerName: "Spencer" });
	assert.equal(sp.length, 1);
	assert.equal(sp[0].ownerName, "Spencer");
});

test("summarizeDuplicatesByOwner aggregates across cards", () => {
	const cards = [
		owned({ cardId: "A", quantity: 3, ownerName: "Spencer" }),
		owned({ cardId: "B", quantity: 4, ownerName: "Spencer" }),
		owned({ cardId: "C", quantity: 2, ownerName: "Jarren" }),
	];
	const prices = new Map([
		["A", 10],
		["B", 20],
		["C", 5],
	]);
	const enriched = enrichDuplicates(cards, prices);
	const summary = summarizeDuplicatesByOwner(enriched);
	const spencer = summary.find((s) => s.ownerName === "Spencer");
	const jarren = summary.find((s) => s.ownerName === "Jarren");
	assert.equal(spencer?.uniqueDuplicateCards, 2);
	assert.equal(spencer?.totalDuplicateCopies, 7);
	assert.equal(spencer?.totalTradeableCopies, 5);
	// Total = (3*10) + (4*20) = 110, Tradeable = (2*10) + (3*20) = 80
	assert.equal(spencer?.totalDuplicateValue, 110);
	assert.equal(spencer?.totalTradeableValue, 80);
	assert.equal(jarren?.uniqueDuplicateCards, 1);
	assert.equal(jarren?.totalTradeableValue, 5);
});

test("summarizeDuplicatesByOwner sorts owners by tradeable value desc", () => {
	const enriched = enrichDuplicates(
		[
			owned({ cardId: "A", quantity: 5, ownerName: "Jarren" }),
			owned({ cardId: "B", quantity: 2, ownerName: "Spencer" }),
		],
		new Map([
			["A", 1],
			["B", 100],
		]),
	);
	const summary = summarizeDuplicatesByOwner(enriched);
	assert.equal(summary[0].ownerName, "Spencer");
	assert.equal(summary[1].ownerName, "Jarren");
});

test("enrichDuplicates handles owners with all singletons", () => {
	const enriched = enrichDuplicates([
		owned({ cardId: "A", quantity: 1 }),
		owned({ cardId: "B", quantity: 1 }),
	]);
	assert.equal(enriched.length, 0);
});
