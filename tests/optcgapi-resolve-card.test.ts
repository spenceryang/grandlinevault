import assert from "node:assert/strict";
import test from "node:test";
import {
	isPromoCardId,
	isStarterCardId,
} from "../src/providers/optcgapi/resolve-card.js";

test("isStarterCardId identifies starter deck cards", () => {
	assert.equal(isStarterCardId("ST01-001"), true);
	assert.equal(isStarterCardId("st10-005_p1"), true);
	assert.equal(isStarterCardId("OP01-001"), false);
});

test("isPromoCardId identifies promo cards", () => {
	assert.equal(isPromoCardId("P-001"), true);
	assert.equal(isPromoCardId("p-055_p1"), true);
	assert.equal(isPromoCardId("ST01-001"), false);
});
