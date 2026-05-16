import assert from "node:assert/strict";
import test from "node:test";
import {
	buildSubTypeCompletion,
	extractSubTypes,
	OPTCG_KNOWN_SUB_TYPES,
	type SubTypeCardInput,
} from "../src/lib/sub-type-completion.js";

function card(
	overrides: Partial<SubTypeCardInput> = {},
): SubTypeCardInput {
	return {
		cardSetId: "OP01-003",
		cardImageId: "OP01-003",
		name: "Monkey.D.Luffy",
		subTypes: "Straw Hat Crew Supernovas",
		...overrides,
	};
}

test("extractSubTypes splits known multi-word sub-types correctly", () => {
	assert.deepEqual(extractSubTypes("Straw Hat Crew Supernovas"), [
		"Straw Hat Crew",
		"Supernovas",
	]);
	assert.deepEqual(extractSubTypes("Animal Straw Hat Crew"), [
		"Straw Hat Crew",
		"Animal",
	]);
	assert.deepEqual(extractSubTypes("Donquixote Pirates"), [
		"Donquixote Pirates",
	]);
});

test("extractSubTypes returns residual tokens for unknown sub-types", () => {
	const tags = extractSubTypes("Straw Hat Crew SomethingUnknown");
	assert.ok(tags.includes("Straw Hat Crew"));
	assert.ok(tags.includes("SomethingUnknown"));
});

test("extractSubTypes returns empty for null/empty input", () => {
	assert.deepEqual(extractSubTypes(null), []);
	assert.deepEqual(extractSubTypes(""), []);
});

test("extractSubTypes respects custom dictionaries", () => {
	const tags = extractSubTypes("New Faction Member", ["New Faction"]);
	assert.deepEqual(tags, ["New Faction", "Member"]);
});

test("buildSubTypeCompletion counts owned vs total per archetype", () => {
	const cards = [
		card({ cardImageId: "OP01-003", subTypes: "Straw Hat Crew Supernovas" }),
		card({
			cardImageId: "OP01-024",
			subTypes: "Straw Hat Crew",
			cardSetId: "OP01-024",
		}),
		card({
			cardImageId: "OP02-001",
			subTypes: "Heart Pirates Supernovas",
			cardSetId: "OP02-001",
		}),
	];
	const owned = new Set(["OP01-003", "OP02-001"]);
	const rows = buildSubTypeCompletion(cards, owned);
	const shc = rows.find((r) => r.subType === "Straw Hat Crew");
	assert.equal(shc?.total, 2);
	assert.equal(shc?.owned, 1);
	assert.equal(shc?.completionFraction, 0.5);
	assert.deepEqual(shc?.missingCardIds, ["OP01-024"]);

	const sn = rows.find((r) => r.subType === "Supernovas");
	assert.equal(sn?.total, 2);
	assert.equal(sn?.owned, 2);
	assert.equal(sn?.completionFraction, 1);
});

test("buildSubTypeCompletion is case-insensitive on owned ids", () => {
	const cards = [card({ cardImageId: "OP01-003" })];
	const rows = buildSubTypeCompletion(cards, new Set(["op01-003"]));
	assert.equal(rows[0].owned, 1);
});

test("buildSubTypeCompletion sorts by total cards desc", () => {
	const cards = [
		card({ cardImageId: "a", cardSetId: "a", subTypes: "Marine" }),
		card({ cardImageId: "b", cardSetId: "b", subTypes: "Marine" }),
		card({ cardImageId: "c", cardSetId: "c", subTypes: "Yonko" }),
	];
	const rows = buildSubTypeCompletion(cards, new Set());
	assert.equal(rows[0].subType, "Marine");
	assert.equal(rows[0].total, 2);
	assert.equal(rows[1].subType, "Yonko");
});

test("buildSubTypeCompletion skips cards with no recognized sub-types", () => {
	const cards = [card({ subTypes: null })];
	const rows = buildSubTypeCompletion(cards, new Set());
	assert.equal(rows.length, 0);
});

test("OPTCG_KNOWN_SUB_TYPES includes the major archetypes", () => {
	const required = ["Straw Hat Crew", "Marine", "Supernovas", "Yonko"];
	for (const r of required) {
		assert.ok(
			OPTCG_KNOWN_SUB_TYPES.includes(r),
			`expected dictionary to include ${r}`,
		);
	}
});
