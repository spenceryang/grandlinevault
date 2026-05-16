import assert from "node:assert/strict";
import test from "node:test";
import {
	enrichWishlist,
	findNextPurchases,
	suggestWishlistFromMasterSet,
	summarizeWishlistBudget,
	type WishlistItem,
} from "../src/lib/wishlist-insights.js";

function wish(overrides: Partial<WishlistItem> = {}): WishlistItem {
	return {
		ownerName: "Spencer",
		cardId: "OP01-003",
		cardName: "Monkey.D.Luffy (003)",
		priority: "High",
		targetPrice: 50,
		...overrides,
	};
}

test("enrichWishlist computes target deltas + targetHit", () => {
	const items = [wish({ cardId: "A", targetPrice: 100 })];
	const prices = new Map([["A", 80]]);
	const enriched = enrichWishlist(items, prices);
	assert.equal(enriched[0].currentMarketPrice, 80);
	assert.equal(enriched[0].dollarsBelowTarget, 20);
	assert.equal(enriched[0].percentBelowTarget, 20);
	assert.equal(enriched[0].targetHit, true);
});

test("enrichWishlist marks targetHit=false when price is above target", () => {
	const items = [wish({ cardId: "A", targetPrice: 50 })];
	const enriched = enrichWishlist(items, new Map([["A", 75]]));
	assert.equal(enriched[0].targetHit, false);
	assert.equal(enriched[0].dollarsBelowTarget, -25);
});

test("enrichWishlist matches cardIds case-insensitively", () => {
	const items = [wish({ cardId: "op01-003", targetPrice: 100 })];
	const enriched = enrichWishlist(items, new Map([["OP01-003", 80]]));
	assert.equal(enriched[0].currentMarketPrice, 80);
});

test("enrichWishlist handles missing prices + missing targets", () => {
	const items = [
		wish({ cardId: "A", targetPrice: null }),
		wish({ cardId: "B", targetPrice: 50 }),
	];
	const enriched = enrichWishlist(items, new Map([["A", 80]]));
	assert.equal(enriched[0].dollarsBelowTarget, null);
	assert.equal(enriched[0].targetHit, false);
	assert.equal(enriched[1].currentMarketPrice, null);
	assert.equal(enriched[1].dollarsBelowTarget, null);
});

test("summarizeWishlistBudget tallies open items only per owner", () => {
	const items = enrichWishlist(
		[
			wish({ cardId: "A", ownerName: "Spencer", targetPrice: 100 }),
			wish({
				cardId: "B",
				ownerName: "Spencer",
				targetPrice: 50,
				status: "Acquired",
			}),
			wish({ cardId: "C", ownerName: "Jarren", targetPrice: 25 }),
		],
		new Map([
			["A", 80],
			["B", 40],
			["C", 20],
		]),
	);
	const budget = summarizeWishlistBudget(items, "Spencer");
	assert.equal(budget.itemCount, 2);
	assert.equal(budget.openItemCount, 1);
	assert.equal(budget.totalTargetSpend, 100);
	assert.equal(budget.totalCurrentSpend, 80);
	assert.equal(budget.totalSavingsAtTarget, -20);
});

test("findNextPurchases picks target-hit items, sorts by priority + price asc", () => {
	const items = enrichWishlist(
		[
			wish({ cardId: "A", priority: "Low", targetPrice: 100 }),
			wish({ cardId: "B", priority: "High", targetPrice: 100 }),
			wish({ cardId: "C", priority: "Medium", targetPrice: 100 }),
			wish({ cardId: "D", priority: "High", targetPrice: 30 }),
		],
		new Map([
			["A", 80],
			["B", 90],
			["C", 60],
			["D", 50],
		]),
	);
	const recs = findNextPurchases(items, "Spencer", 5);
	const cardIds = recs.map((r) => r.item.cardId);
	// D is target-NOT-hit (50 > 30); A, B, C are hit
	// B is High, C is Medium, A is Low → B, C, A
	assert.deepEqual(cardIds, ["B", "C", "A"]);
	assert.match(recs[0].reason, /High priority/);
});

test("findNextPurchases skips Acquired items", () => {
	const items = enrichWishlist(
		[wish({ cardId: "A", status: "Acquired", targetPrice: 100 })],
		new Map([["A", 50]]),
	);
	const recs = findNextPurchases(items, "Spencer");
	assert.equal(recs.length, 0);
});

test("findNextPurchases respects the limit", () => {
	const items = enrichWishlist(
		Array.from({ length: 10 }, (_, i) =>
			wish({ cardId: `c${i}`, priority: "High", targetPrice: 100 }),
		),
		new Map(Array.from({ length: 10 }, (_, i) => [`c${i}`, 50])),
	);
	const recs = findNextPurchases(items, "Spencer", 3);
	assert.equal(recs.length, 3);
});

test("suggestWishlistFromMasterSet excludes cards already on the wishlist", () => {
	const missing = [
		{
			cardId: "OP01-003",
			cardName: "Luffy",
			marketPrice: 10,
			source: "OP-01 master set",
		},
		{
			cardId: "OP01-024",
			cardName: "Zoro",
			marketPrice: 5,
			source: "OP-01 master set",
		},
	];
	const suggestions = suggestWishlistFromMasterSet(
		missing,
		new Set(["OP01-003"]),
	);
	assert.equal(suggestions.length, 1);
	assert.equal(suggestions[0].cardId, "OP01-024");
});

test("suggestWishlistFromMasterSet sorts by estimated price ascending", () => {
	const missing = [
		{ cardId: "X", cardName: "X", marketPrice: 100, source: "S" },
		{ cardId: "Y", cardName: "Y", marketPrice: 5, source: "S" },
		{ cardId: "Z", cardName: "Z", marketPrice: 50, source: "S" },
	];
	const suggestions = suggestWishlistFromMasterSet(missing, new Set());
	assert.deepEqual(
		suggestions.map((s) => s.cardId),
		["Y", "Z", "X"],
	);
});

test("suggestWishlistFromMasterSet respects custom defaultPriority + limit", () => {
	const missing = Array.from({ length: 50 }, (_, i) => ({
		cardId: `c${i}`,
		cardName: `Card ${i}`,
		marketPrice: i,
		source: "S",
	}));
	const suggestions = suggestWishlistFromMasterSet(missing, new Set(), {
		defaultPriority: "High",
		limit: 5,
	});
	assert.equal(suggestions.length, 5);
	for (const s of suggestions) {
		assert.equal(s.suggestedPriority, "High");
	}
});

test("enrichWishlist handles items with no target price gracefully in budget", () => {
	const items = enrichWishlist(
		[wish({ cardId: "A", targetPrice: null })],
		new Map([["A", 50]]),
	);
	const budget = summarizeWishlistBudget(items, "Spencer");
	assert.equal(budget.totalTargetSpend, 0);
	assert.equal(budget.totalCurrentSpend, 50);
});
