import assert from "node:assert/strict";
import test from "node:test";
import {
	PSA_API_BASE_URL_PLACEHOLDER,
	verifyPsaCert,
} from "../src/providers/psa/cert-verification.js";

test("PSA_API_BASE_URL_PLACEHOLDER is set to the assumed base URL", () => {
	assert.equal(
		PSA_API_BASE_URL_PLACEHOLDER,
		"https://api.psacard.com/publicapi",
	);
});

test("verifyPsaCert throws a not-implemented error until docs are accessed", async () => {
	await assert.rejects(
		() => verifyPsaCert("12345678", "fake-token"),
		/not implemented/,
	);
});
