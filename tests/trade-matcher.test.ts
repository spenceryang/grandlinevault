import assert from "node:assert/strict";
import test from "node:test";
import type { OwnedCardRecord } from "../src/lib/collection.js";
import {
	matchTrades,
	summarizeTradeMatchesByOwner,
	type WishlistRecord,
} from "../src/lib/trade-matcher.js";

function owned(
	overrides: Partial<OwnedCardRecord> = {},
): OwnedCardRecord {
	return {
		ownerName: "Spencer",
		cardId: "OP01-003",
		cardName: "Monkey.D.Luffy (003)",
		quantity: 2,
		...overrides,
	};
}

function wish(overrides: Partial<WishlistRecord> = {}): WishlistRecord {
	return {
		ownerName: "Jarren",
		cardId: "OP01-003",
		cardName: "Monkey.D.Luffy (003)",
		priority: "High",
		targetPrice: 50,
		...overrides,
	};
}

test("matchTrades emits a match when owner has duplicates and another owner wishes for it", () => {
	const matches = matchTrades([owned({ quantity: 3 })], [wish()]);
	assert.equal(matches.length, 1);
	assert.equal(matches[0].fromOwner, "Spencer");
	assert.equal(matches[0].toOwner, "Jarren");
	assert.equal(matches[0].cardId, "OP01-003");
	assert.equal(matches[0].availableQuantity, 2); // 3 owned - 1 kept = 2 available
	assert.equal(matches[0].priority, "High");
	assert.equal(matches[0].targetPrice, 50);
});

test("matchTrades skips singletons (need to keep one for yourself)", () => {
	const matches = matchTrades([owned({ quantity: 1 })], [wish()]);
	assert.equal(matches.length, 0);
});

test("matchTrades does not match an owner's wishlist against their own duplicates", () => {
	const matches = matchTrades(
		[owned({ ownerName: "Spencer", quantity: 5 })],
		[wish({ ownerName: "Spencer" })],
	);
	assert.equal(matches.length, 0);
});

test("matchTrades is case-insensitive on cardId", () => {
	const matches = matchTrades(
		[owned({ cardId: "op01-003", quantity: 2 })],
		[wish({ cardId: "OP01-003" })],
	);
	assert.equal(matches.length, 1);
});

test("matchTrades fans out one duplicate to multiple wishers", () => {
	const matches = matchTrades(
		[owned({ ownerName: "Spencer", quantity: 4 })],
		[
			wish({ ownerName: "Jarren" }),
			wish({ ownerName: "Casey" }),
		],
	);
	assert.equal(matches.length, 2);
	const targets = new Set(matches.map((m) => m.toOwner));
	assert.ok(targets.has("Jarren"));
	assert.ok(targets.has("Casey"));
});

test("matchTrades sorts by priority then by available quantity", () => {
	const matches = matchTrades(
		[
			owned({ cardId: "A", ownerName: "Spencer", quantity: 2 }),
			owned({ cardId: "B", ownerName: "Spencer", quantity: 5 }),
		],
		[
			wish({ cardId: "A", priority: "Low" }),
			wish({ cardId: "B", priority: "High" }),
		],
	);
	assert.equal(matches[0].cardId, "B"); // High priority first
	assert.equal(matches[1].cardId, "A");
});

test("matchTrades handles unknown priority gracefully", () => {
	const matches = matchTrades(
		[owned({ cardId: "A", quantity: 2 })],
		[wish({ cardId: "A", priority: "Maybe" })],
	);
	assert.equal(matches.length, 1);
	assert.equal(matches[0].priority, "Maybe");
});

test("matchTrades ignores blank cardIds on either side", () => {
	const matches = matchTrades(
		[owned({ cardId: "   ", quantity: 5 })],
		[wish({ cardId: "OP01-003" })],
	);
	assert.equal(matches.length, 0);
});

test("summarizeTradeMatchesByOwner buckets by (from, to) and sums available", () => {
	const matches = matchTrades(
		[
			owned({ cardId: "A", quantity: 2 }),
			owned({ cardId: "B", quantity: 3 }),
			owned({ cardId: "C", ownerName: "Casey", quantity: 2 }),
		],
		[
			wish({ cardId: "A" }),
			wish({ cardId: "B" }),
			wish({ cardId: "C" }),
		],
	);
	const summary = summarizeTradeMatchesByOwner(matches);
	const spencerToJarren = summary.find(
		(s) => s.fromOwner === "Spencer" && s.toOwner === "Jarren",
	);
	assert.equal(spencerToJarren?.matchCount, 2);
	// A available 1 + B available 2 = 3
	assert.equal(spencerToJarren?.totalAvailable, 3);
});
