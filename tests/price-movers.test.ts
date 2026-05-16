import assert from "node:assert/strict";
import test from "node:test";
import {
	computePriceMovers,
	type PriceSnapshotInput,
} from "../src/lib/price-movers.js";

function snap(
	cardId: string,
	capturedAt: string,
	marketPrice: number,
): PriceSnapshotInput {
	return { cardId, capturedAt, marketPrice };
}

const NOW = new Date("2026-05-16T00:00:00Z");

test("computePriceMovers emits gainer with correct % and $ change", () => {
	const report = computePriceMovers(
		[
			snap("OP01-003", "2026-05-09T00:00:00Z", 10),
			snap("OP01-003", "2026-05-16T00:00:00Z", 15),
		],
		{ now: NOW, windowDays: 7 },
	);
	assert.equal(report.topGainers.length, 1);
	assert.equal(report.topGainers[0].oldPrice, 10);
	assert.equal(report.topGainers[0].newPrice, 15);
	assert.equal(report.topGainers[0].dollarChange, 5);
	assert.equal(report.topGainers[0].percentChange, 50);
	assert.equal(report.topLosers.length, 0);
});

test("computePriceMovers emits loser with correct % and $ change", () => {
	const report = computePriceMovers(
		[
			snap("OP05-119", "2026-05-09T00:00:00Z", 100),
			snap("OP05-119", "2026-05-16T00:00:00Z", 80),
		],
		{ now: NOW, windowDays: 7 },
	);
	assert.equal(report.topLosers.length, 1);
	assert.equal(report.topLosers[0].dollarChange, -20);
	assert.equal(report.topLosers[0].percentChange, -20);
});

test("computePriceMovers sorts gainers desc and losers asc by percent", () => {
	const report = computePriceMovers(
		[
			snap("A", "2026-05-09T00:00:00Z", 10),
			snap("A", "2026-05-16T00:00:00Z", 12),
			snap("B", "2026-05-09T00:00:00Z", 10),
			snap("B", "2026-05-16T00:00:00Z", 50),
			snap("C", "2026-05-09T00:00:00Z", 100),
			snap("C", "2026-05-16T00:00:00Z", 60),
			snap("D", "2026-05-09T00:00:00Z", 100),
			snap("D", "2026-05-16T00:00:00Z", 90),
		],
		{ now: NOW, windowDays: 7 },
	);
	assert.equal(report.topGainers[0].cardId, "B");
	assert.equal(report.topGainers[1].cardId, "A");
	assert.equal(report.topLosers[0].cardId, "C");
	assert.equal(report.topLosers[1].cardId, "D");
});

test("computePriceMovers respects the limit", () => {
	const snapshots: PriceSnapshotInput[] = [];
	for (let i = 0; i < 20; i += 1) {
		snapshots.push(snap(`G${i}`, "2026-05-09T00:00:00Z", 10));
		snapshots.push(snap(`G${i}`, "2026-05-16T00:00:00Z", 20 + i));
	}
	const report = computePriceMovers(snapshots, {
		now: NOW,
		windowDays: 7,
		limit: 5,
	});
	assert.equal(report.topGainers.length, 5);
});

test("computePriceMovers skips cards below the minimum baseline price", () => {
	const report = computePriceMovers(
		[
			snap("Penny", "2026-05-09T00:00:00Z", 0.5),
			snap("Penny", "2026-05-16T00:00:00Z", 100),
		],
		{ now: NOW, windowDays: 7, minOldPrice: 1 },
	);
	assert.equal(report.topGainers.length, 0);
});

test("computePriceMovers falls back to the earliest snapshot when none predate the cutoff", () => {
	const report = computePriceMovers(
		[
			snap("New", "2026-05-13T00:00:00Z", 5),
			snap("New", "2026-05-16T00:00:00Z", 8),
		],
		{ now: NOW, windowDays: 30 },
	);
	assert.equal(report.topGainers.length, 1);
	assert.equal(report.topGainers[0].oldPrice, 5);
});

test("computePriceMovers ignores cards with only one snapshot", () => {
	const report = computePriceMovers([snap("Only", "2026-05-16T00:00:00Z", 5)], {
		now: NOW,
		windowDays: 7,
	});
	assert.equal(report.cardCount, 1);
	assert.equal(report.topGainers.length, 0);
	assert.equal(report.topLosers.length, 0);
});

test("computePriceMovers exposes report metadata", () => {
	const report = computePriceMovers(
		[snap("A", "2026-05-09T00:00:00Z", 10), snap("A", "2026-05-16T00:00:00Z", 11)],
		{ now: NOW, windowDays: 30 },
	);
	assert.equal(report.windowDays, 30);
	assert.equal(report.asOf, NOW.toISOString());
	assert.equal(report.cardCount, 1);
});
