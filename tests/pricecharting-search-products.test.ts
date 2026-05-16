import assert from "node:assert/strict";
import test from "node:test";
import {
	searchPriceChartingProducts,
	toProductSummary,
} from "../src/providers/pricecharting/search-products.js";

test("toProductSummary converts pennies to dollars", () => {
	const summary = toProductSummary({
		id: 42,
		"product-name": "Charizard #4",
		"console-name": "Pokemon Cards",
		"loose-price": 1732,
		"bgs-10-price": 250000,
	});
	assert.equal(summary.id, "42");
	assert.equal(summary.prices.loose, 17.32);
	assert.equal(summary.prices.bgs10, 2500);
	assert.equal(summary.prices.cib, null);
});

test("searchPriceChartingProducts hits /api/products and parses results", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(
			JSON.stringify({
				status: "success",
				products: [
					{ id: 1, "product-name": "Charizard 4/102", "loose-price": 1732 },
					{ id: 2, "product-name": "Charizard ex", "loose-price": 5000 },
				],
			}),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
	}) as typeof fetch;
	try {
		const results = await searchPriceChartingProducts("charizard", "token-abc");
		assert.match(capturedUrl, /\/api\/products\?/);
		assert.match(capturedUrl, /t=token-abc/);
		assert.match(capturedUrl, /q=charizard/);
		assert.equal(results.length, 2);
		assert.equal(results[0].productName, "Charizard 4/102");
		assert.equal(results[1].prices.loose, 50);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("searchPriceChartingProducts returns empty array when products missing", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ status: "success" }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		const results = await searchPriceChartingProducts("foo", "tok");
		assert.deepEqual(results, []);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("searchPriceChartingProducts rejects empty inputs", async () => {
	await assert.rejects(
		() => searchPriceChartingProducts("anything", ""),
		/API token is required/,
	);
	await assert.rejects(
		() => searchPriceChartingProducts("   ", "tok"),
		/must not be empty/,
	);
});

test("searchPriceChartingProducts surfaces 403 token errors", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 403 })) as typeof fetch;
	try {
		await assert.rejects(
			() => searchPriceChartingProducts("x", "bad"),
			/rejected the API token/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("searchPriceChartingProducts surfaces error envelope from body", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(
			JSON.stringify({
				status: "error",
				"error-message": "Query too short",
			}),
			{ status: 200, headers: { "content-type": "application/json" } },
		)) as typeof fetch;
	try {
		await assert.rejects(
			() => searchPriceChartingProducts("a", "tok"),
			/Query too short/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("searchPriceChartingProducts throws on non-2xx generic", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 503 })) as typeof fetch;
	try {
		await assert.rejects(
			() => searchPriceChartingProducts("x", "tok"),
			/failed with 503/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
