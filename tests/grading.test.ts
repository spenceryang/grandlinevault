import assert from "node:assert/strict";
import test from "node:test";
import { estimatePreGrade } from "../src/lib/grading.js";

test("returns a high-confidence clean estimate", () => {
	const estimate = estimatePreGrade({
		frontCenteringRatio: 0.52,
		backCenteringRatio: 0.6,
	});

	assert.equal(estimate.rangeLabel, "Likely PSA 9–10");
	assert.equal(estimate.confidence, "High");
});

test("lowers confidence when glare is present", () => {
	const estimate = estimatePreGrade({
		frontCenteringRatio: 0.54,
		hasGlare: true,
		surfaceIssueCount: 1,
	});

	assert.equal(estimate.confidence, "Low");
	assert.match(estimate.reasons.join(" "), /glare/);
});
