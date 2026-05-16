import assert from "node:assert/strict";
import test from "node:test";
import {
	aggregateRecognizedScans,
	buildDecklistFromBulkScan,
	classifyDecklistSlot,
	type DecklistCardMetadata,
	type RecognizedScan,
} from "../src/lib/bulk-deck-scan.js";

function meta(
	overrides: Partial<DecklistCardMetadata> = {},
): DecklistCardMetadata {
	return {
		name: "Sample",
		cardType: "Character",
		color: "Red",
		cost: 3,
		marketPrice: 1.0,
		...overrides,
	};
}

function scan(
	cardSetId: string,
	confidence: number,
	overrides: Partial<RecognizedScan> = {},
): RecognizedScan {
	return { cardSetId, confidence, ...overrides };
}

test("classifyDecklistSlot maps OPTCG card types to deck slots", () => {
	assert.equal(classifyDecklistSlot("Leader"), "Leader");
	assert.equal(classifyDecklistSlot("Character"), "Character");
	assert.equal(classifyDecklistSlot("Event"), "Event");
	assert.equal(classifyDecklistSlot("Stage"), "Stage");
	assert.equal(classifyDecklistSlot("DON!!"), "DON");
	assert.equal(classifyDecklistSlot(null), "Character");
	assert.equal(classifyDecklistSlot("WeirdType"), "Character");
});

test("buildDecklistFromBulkScan aggregates duplicates with quantity", () => {
	const enrichment = new Map<string, DecklistCardMetadata>([
		["OP01-024", meta({ name: "Roronoa Zoro (024)", cost: 5 })],
		["OP01-010", meta({ name: "Sanji", cost: 4 })],
	]);
	const scans: RecognizedScan[] = [
		scan("OP01-024", 0.95),
		scan("OP01-024", 0.94),
		scan("OP01-024", 0.92),
		scan("OP01-010", 0.9),
	];
	const result = buildDecklistFromBulkScan(scans, enrichment);
	const zoro = result.entries.find((e) => e.cardSetId === "OP01-024");
	const sanji = result.entries.find((e) => e.cardSetId === "OP01-010");
	assert.equal(zoro?.quantity, 3);
	assert.equal(sanji?.quantity, 1);
	assert.equal(result.totalRecognized, 4);
	assert.equal(result.skippedLowConfidence, 0);
	assert.deepEqual(result.unknownCards, []);
});

test("buildDecklistFromBulkScan caps Leader quantity at 1", () => {
	const enrichment = new Map<string, DecklistCardMetadata>([
		["OP01-001", meta({ name: "Zoro Leader", cardType: "Leader" })],
	]);
	const scans = [
		scan("OP01-001", 0.99),
		scan("OP01-001", 0.99),
		scan("OP01-001", 0.99),
	];
	const result = buildDecklistFromBulkScan(scans, enrichment);
	const leader = result.entries[0];
	assert.equal(leader.slot, "Leader");
	assert.equal(leader.quantity, 1);
});

test("buildDecklistFromBulkScan caps non-Leader at maxCopiesPerCard", () => {
	const enrichment = new Map<string, DecklistCardMetadata>([
		["OP01-010", meta({ cardType: "Character" })],
	]);
	const scans = Array.from({ length: 7 }, () => scan("OP01-010", 0.95));
	const result = buildDecklistFromBulkScan(scans, enrichment);
	assert.equal(result.entries[0].quantity, 4);
});

test("buildDecklistFromBulkScan skips low-confidence scans", () => {
	const enrichment = new Map<string, DecklistCardMetadata>([
		["OP01-010", meta({ cardType: "Character" })],
	]);
	const scans = [
		scan("OP01-010", 0.5),
		scan("OP01-010", 0.6),
		scan("OP01-010", 0.95),
	];
	const result = buildDecklistFromBulkScan(scans, enrichment);
	assert.equal(result.skippedLowConfidence, 2);
	assert.equal(result.entries[0].quantity, 1);
});

test("buildDecklistFromBulkScan tracks unknown cards but still emits them", () => {
	const enrichment = new Map<string, DecklistCardMetadata>();
	const scans = [scan("MYSTERY-001", 0.95)];
	const result = buildDecklistFromBulkScan(scans, enrichment);
	assert.deepEqual(result.unknownCards, ["MYSTERY-001"]);
	assert.equal(result.entries[0].cardSetId, "MYSTERY-001");
	assert.equal(result.entries[0].name, "MYSTERY-001");
});

test("buildDecklistFromBulkScan respects a custom confidence threshold", () => {
	const enrichment = new Map<string, DecklistCardMetadata>([
		["A", meta({ cardType: "Character" })],
		["B", meta({ cardType: "Character" })],
	]);
	const scans = [scan("A", 0.7), scan("B", 0.85)];
	const result = buildDecklistFromBulkScan(scans, enrichment, {
		confidenceThreshold: 0.6,
	});
	assert.equal(result.entries.length, 2);
});

test("aggregateRecognizedScans returns case-insensitive counts", () => {
	const counts = aggregateRecognizedScans([
		scan("op01-024", 0.9),
		scan("OP01-024", 0.9),
		scan("OP01-010", 0.9),
	]);
	assert.equal(counts.get("OP01-024"), 2);
	assert.equal(counts.get("OP01-010"), 1);
});

test("buildDecklistFromBulkScan handles empty input", () => {
	const result = buildDecklistFromBulkScan([], new Map());
	assert.equal(result.entries.length, 0);
	assert.equal(result.totalRecognized, 0);
});
