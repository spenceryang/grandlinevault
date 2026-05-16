import assert from "node:assert/strict";
import test from "node:test";
import {
	getPriceChartingProduct,
	type PriceChartingProductRaw,
	toProduct,
} from "../src/providers/pricecharting/get-product.js";

const sampleRaw: PriceChartingProductRaw = {
	status: "success",
	id: 12345,
	"product-name": "Charizard #4",
	"console-name": "Pokemon Cards",
	"release-date": "1999-01-09",
	upc: "12345678901",
	"sales-volume": 200,
	"loose-price": 1732,
	"cib-price": 2500,
	"new-price": 10000,
	"graded-price": 50000,
	"bgs-10-price": 250000,
	"condition-17-price": 200000,
	"condition-18-price": 180000,
	"retail-loose-buy": 1500,
	"retail-loose-sell": 1800,
};

test("toProduct converts pennies to dollars", () => {
	const product = toProduct(sampleRaw);
	assert.equal(product.id, "12345");
	assert.equal(product.productName, "Charizard #4");
	assert.equal(product.consoleName, "Pokemon Cards");
	assert.equal(product.prices.loose, 17.32);
	assert.equal(product.prices.cib, 25.0);
	assert.equal(product.prices.new, 100.0);
	assert.equal(product.prices.graded, 500.0);
	assert.equal(product.prices.bgs10, 2500.0);
	assert.equal(product.prices.cgc10, 2000.0);
	assert.equal(product.prices.sgc10, 1800.0);
	assert.equal(product.retail.looseBuy, 15.0);
	assert.equal(product.retail.looseSell, 18.0);
});

test("toProduct handles missing prices as null", () => {
	const product = toProduct({ status: "success", id: 1, "product-name": "x" });
	assert.equal(product.prices.loose, null);
	assert.equal(product.prices.bgs10, null);
	assert.equal(product.retail.cibBuy, null);
});

test("getPriceChartingProduct attaches token and id to query string", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify(sampleRaw), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const product = await getPriceChartingProduct({ id: "12345" }, "fake-token");
		assert.match(capturedUrl, /t=fake-token/);
		assert.match(capturedUrl, /id=12345/);
		assert.equal(product.id, "12345");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getPriceChartingProduct supports q lookup", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify(sampleRaw), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await getPriceChartingProduct({ q: "Charizard Pokemon" }, "tok");
		assert.match(capturedUrl, /q=Charizard\+Pokemon/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getPriceChartingProduct supports upc lookup", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify(sampleRaw), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await getPriceChartingProduct({ upc: "12345678901" }, "tok");
		assert.match(capturedUrl, /upc=12345678901/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getPriceChartingProduct rejects missing API token", async () => {
	await assert.rejects(
		() => getPriceChartingProduct({ id: "1" }, ""),
		/API token is required/,
	);
});

test("getPriceChartingProduct surfaces 401/403 as token errors", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 403 })) as typeof fetch;
	try {
		await assert.rejects(
			() => getPriceChartingProduct({ id: "1" }, "bad-token"),
			/rejected the API token/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getPriceChartingProduct surfaces error envelope from response body", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(
			JSON.stringify({
				status: "error",
				"error-message": "Product not found",
			}),
			{ status: 200, headers: { "content-type": "application/json" } },
		)) as typeof fetch;
	try {
		await assert.rejects(
			() => getPriceChartingProduct({ id: "999" }, "tok"),
			/Product not found/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getPriceChartingProduct throws on non-2xx generic", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 500 })) as typeof fetch;
	try {
		await assert.rejects(
			() => getPriceChartingProduct({ id: "1" }, "tok"),
			/failed with 500/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
