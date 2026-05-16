import assert from "node:assert/strict";
import test from "node:test";
import {
	getPsaAccessToken,
	isTokenExpired,
	PSA_TOKEN_ENDPOINT_PLACEHOLDER,
} from "../src/providers/psa/oauth.js";

test("PSA_TOKEN_ENDPOINT_PLACEHOLDER is the assumed OAuth URL", () => {
	assert.equal(
		PSA_TOKEN_ENDPOINT_PLACEHOLDER,
		"https://api.psacard.com/oauth/token",
	);
});

test("getPsaAccessToken throws not-implemented until docs are accessed", async () => {
	await assert.rejects(
		() =>
			getPsaAccessToken({
				username: "u",
				password: "p",
				clientId: "c",
				clientSecret: "s",
			}),
		/not implemented/,
	);
});

test("isTokenExpired flags tokens that have already expired", () => {
	const expired = isTokenExpired(
		{ expiresAt: "2020-01-01T00:00:00Z" },
		new Date("2026-05-16T00:00:00Z"),
	);
	assert.equal(expired, true);
});

test("isTokenExpired flags tokens within the skew window", () => {
	// Token expires in 10 seconds; default skew is 30 seconds → expired
	const now = new Date("2026-05-16T00:00:00Z");
	const tenSecondsLater = new Date(now.getTime() + 10_000).toISOString();
	const expired = isTokenExpired({ expiresAt: tenSecondsLater }, now);
	assert.equal(expired, true);
});

test("isTokenExpired returns false for tokens well in the future", () => {
	const now = new Date("2026-05-16T00:00:00Z");
	const oneHourLater = new Date(now.getTime() + 3_600_000).toISOString();
	const expired = isTokenExpired({ expiresAt: oneHourLater }, now);
	assert.equal(expired, false);
});

test("isTokenExpired treats unparseable expiresAt as expired", () => {
	const expired = isTokenExpired({ expiresAt: "not-a-date" });
	assert.equal(expired, true);
});
