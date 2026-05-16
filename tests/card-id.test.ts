import assert from "node:assert/strict";
import test from "node:test";
import {
	inferSetCode,
	isSupportedMainSet,
	normalizeCardId,
} from "../src/lib/card-id.js";

test("normalizes card ids", () => {
	assert.equal(normalizeCardId(" op01-001 "), "OP01-001");
});

test("infers OP set codes", () => {
	assert.equal(inferSetCode("OP05-119"), "OP05");
	assert.equal(isSupportedMainSet("OP15"), true);
	assert.equal(isSupportedMainSet("OP16"), false);
});
