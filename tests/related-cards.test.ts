import assert from "node:assert/strict";
import test from "node:test";
import {
	extractCharacterName,
	findRelatedCards,
	type RelatedCardInput,
	scoreRelatedCard,
	splitColors,
	splitSubTypes,
} from "../src/lib/related-cards.js";

function card(overrides: Partial<RelatedCardInput> = {}): RelatedCardInput {
	return {
		cardSetId: "OP01-003",
		cardImageId: "OP01-003",
		name: "Monkey.D.Luffy (003)",
		setId: "OP-01",
		setName: "Romance Dawn",
		rarity: "L",
		color: "Red",
		cardType: "Leader",
		cost: null,
		power: 5000,
		subTypes: "Straw Hat Crew Supernovas",
		marketPrice: 12.55,
		imageUrl: "https://optcgapi.com/img.jpg",
		...overrides,
	};
}

test("extractCharacterName strips trailing parenthetical print suffixes", () => {
	assert.equal(
		extractCharacterName("Monkey.D.Luffy (003)"),
		"Monkey.D.Luffy",
	);
	assert.equal(
		extractCharacterName("Monkey.D.Luffy (003) (Parallel)"),
		"Monkey.D.Luffy",
	);
	assert.equal(extractCharacterName("Roronoa Zoro"), "Roronoa Zoro");
});

test("splitColors handles multi-color cards", () => {
	assert.deepEqual(splitColors("Red Green"), ["Red", "Green"]);
	assert.deepEqual(splitColors("Red/Green"), ["Red", "Green"]);
	assert.deepEqual(splitColors(null), []);
	assert.deepEqual(splitColors(""), []);
});

test("splitSubTypes tokenizes whitespace-separated tags", () => {
	assert.deepEqual(splitSubTypes("Straw Hat Crew Supernovas"), [
		"Straw",
		"Hat",
		"Crew",
		"Supernovas",
	]);
	assert.deepEqual(splitSubTypes(null), []);
});

test("scoreRelatedCard heavy weight on same character", () => {
	const a = card({ cardImageId: "OP01-003" });
	const b = card({
		cardImageId: "OP01-024",
		cardSetId: "OP01-024",
		name: "Monkey.D.Luffy (024)",
		cardType: "Character",
		rarity: "SR",
	});
	const { score, reasons } = scoreRelatedCard(a, b);
	assert.ok(reasons.includes("same-character"));
	assert.ok(score >= 10);
});

test("scoreRelatedCard zero for completely unrelated cards", () => {
	const a = card();
	const b = card({
		cardImageId: "OP-X",
		cardSetId: "OP-X",
		name: "Donquixote Doflamingo",
		setId: "OP-99",
		setName: "Other",
		color: "Black",
		cardType: "Character",
		rarity: "C",
		subTypes: "Donquixote Pirates",
		cost: 9,
	});
	const { score } = scoreRelatedCard(a, b);
	assert.equal(score, 0);
});

test("scoreRelatedCard sums weights for partial matches", () => {
	const a = card({ cardType: "Character", cost: 3, color: "Red" });
	const b = card({
		cardImageId: "OP01-010",
		cardSetId: "OP01-010",
		name: "Other Card",
		cardType: "Character",
		cost: 3,
		color: "Red",
		subTypes: "Straw Hat Crew",
		rarity: "L",
	});
	const { score, reasons } = scoreRelatedCard(a, b);
	// same-set 3 + same-color 2 + same-type 2 + shared-sub-types 9 (3 tokens × 3) + cost-curve 2 + same-rarity 1 = 19
	assert.equal(score, 19);
	assert.ok(reasons.includes("same-set"));
	assert.ok(reasons.includes("same-color"));
	assert.ok(reasons.includes("same-type"));
	assert.ok(reasons.includes("shared-sub-types"));
	assert.ok(reasons.includes("cost-curve"));
	assert.ok(reasons.includes("same-rarity"));
});

test("findRelatedCards excludes self and same base card by default", () => {
	const target = card({ cardImageId: "OP01-003", cardSetId: "OP01-003" });
	const candidates: RelatedCardInput[] = [
		target,
		card({
			cardImageId: "OP01-003_p1",
			cardSetId: "OP01-003",
			name: "Monkey.D.Luffy (003) (Parallel)",
		}),
		card({
			cardImageId: "OP01-024",
			cardSetId: "OP01-024",
			name: "Monkey.D.Luffy (024)",
		}),
	];
	const results = findRelatedCards(target, candidates, { limit: 5 });
	assert.equal(results.length, 1);
	assert.equal(results[0].card.cardImageId, "OP01-024");
});

test("findRelatedCards toggles exclude-same-variant", () => {
	const target = card({ cardImageId: "OP01-003", cardSetId: "OP01-003" });
	const parallel = card({
		cardImageId: "OP01-003_p1",
		cardSetId: "OP01-003",
		name: "Monkey.D.Luffy (003) (Parallel)",
	});
	const r1 = findRelatedCards(target, [parallel], {
		excludeSameVariant: false,
	});
	assert.equal(r1.length, 1);
	const r2 = findRelatedCards(target, [parallel]);
	assert.equal(r2.length, 0);
});

test("findRelatedCards sorts by score desc and respects limit", () => {
	const target = card({
		cardImageId: "src",
		cardSetId: "src",
		name: "Source",
		cardType: "Character",
		cost: 3,
		color: "Red",
		subTypes: "Straw Hat Crew",
	});
	const candidates = [
		card({ cardImageId: "low", cardSetId: "low", name: "Far", cardType: "Stage", cost: 9, color: "Black", subTypes: "x" }),
		card({ cardImageId: "high", cardSetId: "high", name: "Close", cardType: "Character", cost: 3, color: "Red", subTypes: "Straw Hat Crew" }),
		card({ cardImageId: "mid", cardSetId: "mid", name: "Mid", cardType: "Character", cost: 4, color: "Red", subTypes: "Other" }),
	];
	const results = findRelatedCards(target, candidates, { limit: 2 });
	assert.equal(results.length, 2);
	assert.equal(results[0].card.cardImageId, "high");
	assert.ok(results[0].score > results[1].score);
});

test("findRelatedCards drops zero-score candidates", () => {
	const target = card({
		name: "Apple",
		setId: "X",
		color: "Pink",
		cardType: "Z",
		subTypes: "alpha",
		cost: 0,
		rarity: "X",
	});
	const noisy = card({
		cardImageId: "noisy",
		cardSetId: "noisy",
		name: "Orange",
		setId: "Y",
		color: "Lime",
		cardType: "W",
		subTypes: "beta",
		cost: 9,
		rarity: "Y",
	});
	const results = findRelatedCards(target, [noisy]);
	assert.equal(results.length, 0);
});
