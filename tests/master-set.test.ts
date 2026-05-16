import assert from "node:assert/strict";
import test from "node:test";
import {
	buildMasterSetEntries,
	classifyMasterSetVariant,
	type MasterSetEntry,
	type MasterSetSourceCard,
	summarizeMasterSetCompletion,
} from "../src/lib/master-set.js";

const baseCard: MasterSetSourceCard = {
	card_set_id: "OP01-001",
	card_image_id: "OP01-001",
	card_name: "Roronoa Zoro (001)",
	set_id: "OP-01",
	set_name: "Romance Dawn",
	rarity: "L",
	card_color: "Red",
	card_type: "Leader",
	card_image: "https://optcgapi.com/media/static/Card_Images/OP01-001.jpg",
};

const parallelCard: MasterSetSourceCard = {
	...baseCard,
	card_image_id: "OP01-001_p1",
	card_image: "https://optcgapi.com/media/static/Card_Images/OP01-001_p1.jpg",
};

test("classifyMasterSetVariant identifies base vs parallel suffixes", () => {
	assert.equal(classifyMasterSetVariant("OP01-001", "OP01-001"), "base");
	assert.equal(classifyMasterSetVariant("OP01-001_p1", "OP01-001"), "parallel");
	assert.equal(classifyMasterSetVariant("OP01-001_p2", "OP01-001"), "parallel");
	assert.equal(
		classifyMasterSetVariant("OP01-001_alt", "OP01-001"),
		"alt-art",
	);
	assert.equal(
		classifyMasterSetVariant("OP01-001_promo", "OP01-001"),
		"promo",
	);
});

test("buildMasterSetEntries groups every printing as its own entry", () => {
	const entries = buildMasterSetEntries([baseCard, parallelCard]);
	assert.equal(entries.length, 2);
	assert.equal(entries[0].variantId, "OP01-001");
	assert.equal(entries[0].variant, "base");
	assert.equal(entries[1].variantId, "OP01-001_p1");
	assert.equal(entries[1].variant, "parallel");
	assert.equal(entries[1].baseCardId, "OP01-001");
});

test("summarizeMasterSetCompletion computes counts and percentage", () => {
	const entries: ReadonlyArray<MasterSetEntry & { owned: boolean }> = [
		{ ...buildMasterSetEntries([baseCard])[0], owned: true },
		{ ...buildMasterSetEntries([parallelCard])[0], owned: false },
		{
			...buildMasterSetEntries([
				{ ...baseCard, card_set_id: "OP01-002", card_image_id: "OP01-002" },
			])[0],
			owned: true,
		},
	];
	const summary = summarizeMasterSetCompletion(entries);
	assert.equal(summary.total, 3);
	assert.equal(summary.ownedTotal, 2);
	assert.equal(summary.baseTotal, 2);
	assert.equal(summary.baseOwned, 2);
	assert.equal(summary.parallelTotal, 1);
	assert.equal(summary.parallelOwned, 0);
	assert.equal(summary.completionPercent, 66.67);
});

test("summarizeMasterSetCompletion handles empty set", () => {
	const summary = summarizeMasterSetCompletion([]);
	assert.equal(summary.total, 0);
	assert.equal(summary.completionPercent, 0);
});
