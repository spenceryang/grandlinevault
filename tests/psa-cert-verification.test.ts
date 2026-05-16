import assert from "node:assert/strict";
import test from "node:test";
import {
	getPsaCertImages,
	PSA_API_BASE_URL,
	type PsaCertRaw,
	toCertVerification,
	verifyPsaCert,
} from "../src/providers/psa/cert-verification.js";

const sampleRaw: PsaCertRaw = {
	PSACert: {
		CertNumber: "40503120",
		SpecID: 12345,
		SpecNumber: "4",
		LabelType: "Modern",
		ReverseBarCode: false,
		Year: "1999",
		Brand: "Pokemon",
		Category: "TCG Cards",
		CardNumber: "4",
		Subject: "Charizard",
		Variety: "Holo",
		IsPSADNA: false,
		IsDualCert: false,
		GradeDescription: "GEM MT",
		CardGrade: "10",
		TotalPopulation: 1234,
		TotalPopulationWithQualifier: 1240,
		PopulationHigher: 0,
	},
};

test("PSA_API_BASE_URL points at the PSA Public API root", () => {
	assert.equal(PSA_API_BASE_URL, "https://api.psacard.com/publicapi");
});

test("toCertVerification normalizes the wrapped PSACert response", () => {
	const v = toCertVerification(sampleRaw);
	assert.equal(v.certNumber, "40503120");
	assert.equal(v.specId, 12345);
	assert.equal(v.cardGrade, "10");
	assert.equal(v.gradeDescription, "GEM MT");
	assert.equal(v.cardName, "Charizard");
	assert.equal(v.totalPopulation, 1234);
	assert.equal(v.isPsaDna, false);
});

test("toCertVerification handles missing optional fields", () => {
	const v = toCertVerification({
		PSACert: { CertNumber: "1" },
	} as PsaCertRaw);
	assert.equal(v.certNumber, "1");
	assert.equal(v.specId, null);
	assert.equal(v.brand, null);
	assert.equal(v.isPsaDna, false);
});

test("verifyPsaCert hits the documented endpoint with bearer auth", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	let capturedInit: RequestInit | undefined;
	globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		capturedUrl = String(input);
		capturedInit = init;
		return new Response(JSON.stringify(sampleRaw), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const result = await verifyPsaCert("40503120", "token-abc");
		assert.match(
			capturedUrl,
			/api\.psacard\.com\/publicapi\/cert\/GetByCertNumber\/40503120$/,
		);
		const headers = capturedInit?.headers as Record<string, string>;
		assert.equal(headers.Authorization, "bearer token-abc");
		assert.equal(result.cardName, "Charizard");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("verifyPsaCert rejects empty cert and empty token", async () => {
	await assert.rejects(() => verifyPsaCert("   ", "tok"), /must not be empty/);
	await assert.rejects(
		() => verifyPsaCert("123", ""),
		/PSA_AUTHORIZATION_TOKEN/,
	);
});

test("verifyPsaCert surfaces specific errors per status code", async () => {
	const originalFetch = globalThis.fetch;
	const cases = [
		{ status: 401, match: /rejected the access token/ },
		{ status: 403, match: /rejected the access token/ },
		{ status: 404, match: /cert not found/ },
		{ status: 429, match: /rate limit/ },
		{ status: 500, match: /failed with 500/ },
	];
	try {
		for (const c of cases) {
			globalThis.fetch = (async () =>
				new Response("", { status: c.status })) as typeof fetch;
			await assert.rejects(
				() => verifyPsaCert("123", "tok"),
				c.match,
				`status ${c.status} should match ${c.match}`,
			);
		}
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getPsaCertImages normalizes IsFrontImage flag", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(
			String(input),
			/\/cert\/GetImagesByCertNumber\/40503120$/,
		);
		return new Response(
			JSON.stringify([
				{ IsFrontImage: true, ImageURL: "https://psacard.com/img/front.jpg" },
				{ IsFrontImage: false, ImageURL: "https://psacard.com/img/back.jpg" },
				{ ImageURL: undefined },
			]),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
	}) as typeof fetch;
	try {
		const images = await getPsaCertImages("40503120", "tok");
		assert.equal(images.length, 2);
		assert.equal(images[0].imageType, "front");
		assert.equal(images[1].imageType, "back");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getPsaCertImages returns empty array on 404", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 404 })) as typeof fetch;
	try {
		const images = await getPsaCertImages("does-not-exist", "tok");
		assert.deepEqual(images, []);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
