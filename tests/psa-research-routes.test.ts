import assert from "node:assert/strict";
import test from "node:test";
import {
	getPsaAuctionPrices,
	getPsaCardFacts,
	getPsaPopulationReport,
	getPsaPriceGuide,
	PSA_API_BASE_URL_PLACEHOLDER,
} from "../src/providers/psa/research-routes.js";

test("PSA_API_BASE_URL_PLACEHOLDER matches the assumed base URL", () => {
	assert.equal(
		PSA_API_BASE_URL_PLACEHOLDER,
		"https://api.psacard.com/publicapi",
	);
});

test("getPsaPopulationReport throws not-implemented until docs are accessed", async () => {
	await assert.rejects(
		() => getPsaPopulationReport(123456, "token"),
		/not implemented/,
	);
});

test("getPsaAuctionPrices throws not-implemented", async () => {
	await assert.rejects(
		() => getPsaAuctionPrices(123456, "token"),
		/not implemented/,
	);
});

test("getPsaPriceGuide throws not-implemented", async () => {
	await assert.rejects(
		() => getPsaPriceGuide(123456, "token"),
		/not implemented/,
	);
});

test("getPsaCardFacts throws not-implemented", async () => {
	await assert.rejects(
		() => getPsaCardFacts(123456, "token"),
		/not implemented/,
	);
});
