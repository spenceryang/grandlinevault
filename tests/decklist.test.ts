import assert from "node:assert/strict";
import test from "node:test";
import {
	type DecklistEntry,
	OPTCG_DON_COUNT,
	OPTCG_MAIN_DECK_SIZE,
	summarizeDecklist,
	validateOptcgDecklist,
} from "../src/lib/decklist.js";

function leader(overrides: Partial<DecklistEntry> = {}): DecklistEntry {
	return {
		cardSetId: "OP01-001",
		name: "Roronoa Zoro",
		slot: "Leader",
		quantity: 1,
		color: "Red",
		...overrides,
	};
}

function character(
	cardSetId: string,
	overrides: Partial<DecklistEntry> = {},
): DecklistEntry {
	return {
		cardSetId,
		name: `Character ${cardSetId}`,
		slot: "Character",
		quantity: 4,
		color: "Red",
		cost: 3,
		marketPrice: 1.0,
		...overrides,
	};
}

function fillMainDeckTo50(): DecklistEntry[] {
	// 12 Character entries × 4 copies = 48, then 1 entry × 2 = 50
	const entries: DecklistEntry[] = [];
	for (let i = 2; i < 14; i += 1) {
		entries.push(character(`OP01-${String(i).padStart(3, "0")}`, { cost: i % 7 }));
	}
	entries.push(
		character("OP01-014", { quantity: 2, cost: 2 }),
	);
	return entries;
}

test("summarizeDecklist counts by slot and totals quantities", () => {
	const entries: DecklistEntry[] = [
		leader({ marketPrice: 2.97 }),
		character("OP01-010", { quantity: 4, cost: 3, marketPrice: 1.0 }),
		character("OP01-011", { quantity: 2, cost: 2, color: "Green", marketPrice: 0.5 }),
		{ cardSetId: "DON_1", name: "DON!! Card", slot: "DON", quantity: 10 },
	];
	const stats = summarizeDecklist(entries);
	assert.equal(stats.leaderCount, 1);
	assert.equal(stats.mainDeckCount, 6);
	assert.equal(stats.donCount, 10);
	assert.equal(stats.totalCards, 17);
	assert.equal(stats.uniqueCards, 4);
	// Estimated value = 2.97 + 4*1 + 2*0.5 = 7.97
	assert.equal(stats.estimatedValue, 7.97);
});

test("summarizeDecklist computes color breakdown sorted desc", () => {
	const entries = [
		leader({ color: "Red" }),
		character("a", { quantity: 4, color: "Red" }),
		character("b", { quantity: 4, color: "Red" }),
		character("c", { quantity: 4, color: "Green" }),
	];
	const stats = summarizeDecklist(entries);
	assert.equal(stats.colorBreakdown[0].color, "Red");
	assert.equal(stats.colorBreakdown[0].count, 9);
	assert.equal(stats.colorBreakdown[1].color, "Green");
	assert.equal(stats.colorBreakdown[1].count, 4);
});

test("summarizeDecklist cost curve sorted by cost asc, excludes Leader and DON", () => {
	const entries = [
		leader(),
		character("a", { quantity: 4, cost: 2 }),
		character("b", { quantity: 4, cost: 5 }),
		character("c", { quantity: 2, cost: 2 }),
	];
	const stats = summarizeDecklist(entries);
	assert.equal(stats.costCurve.length, 2);
	assert.equal(stats.costCurve[0].cost, 2);
	assert.equal(stats.costCurve[0].count, 6);
	assert.equal(stats.costCurve[1].cost, 5);
	assert.equal(stats.costCurve[1].count, 4);
});

test("validateOptcgDecklist requires exactly 1 Leader", () => {
	const result = validateOptcgDecklist(fillMainDeckTo50());
	assert.equal(result.valid, false);
	assert.ok(result.errors.some((e) => /Leader/.test(e)));
});

test("validateOptcgDecklist requires exactly 50 main-deck cards", () => {
	const result = validateOptcgDecklist([
		leader(),
		character("OP01-010", { quantity: 3 }),
	]);
	assert.equal(result.valid, false);
	assert.ok(
		result.errors.some((e) =>
			e.includes(`exactly ${OPTCG_MAIN_DECK_SIZE} cards`),
		),
	);
});

test("validateOptcgDecklist enforces max 4 copies per card", () => {
	const result = validateOptcgDecklist([
		leader(),
		character("OP01-010", { quantity: 5 }),
		...fillMainDeckTo50().slice(0, -1),
	]);
	assert.ok(result.errors.some((e) => /Too many copies/.test(e)));
});

test("validateOptcgDecklist allows DON cards != 10 with a warning, not error", () => {
	const result = validateOptcgDecklist([
		leader(),
		...fillMainDeckTo50(),
		{ cardSetId: "DON_1", name: "DON!!", slot: "DON", quantity: 5 },
	]);
	assert.ok(result.warnings.some((w) => /DON!! cards/.test(w)));
});

test("validateOptcgDecklist passes a legal 51-card Red deck (1L + 50)", () => {
	const result = validateOptcgDecklist([
		leader({ color: "Red" }),
		...fillMainDeckTo50(),
	]);
	assert.equal(result.valid, true, JSON.stringify(result.errors));
	assert.equal(result.stats.leaderCount, 1);
	assert.equal(result.stats.mainDeckCount, OPTCG_MAIN_DECK_SIZE);
});

test("validateOptcgDecklist warns about off-color main-deck cards", () => {
	const main = fillMainDeckTo50();
	main[0] = { ...main[0], color: "Blue" };
	const result = validateOptcgDecklist([
		leader({ color: "Red" }),
		...main,
	]);
	assert.ok(
		result.warnings.some((w) => /color identity/.test(w)),
		"expected off-color warning",
	);
});

test("OPTCG_DON_COUNT constant matches docs", () => {
	assert.equal(OPTCG_DON_COUNT, 10);
});
