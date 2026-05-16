import assert from "node:assert/strict";
import test from "node:test";
import {
	fetchOptcgCardImage,
	fetchOptcgCardImages,
	parseOptcgImageUrl,
} from "../src/providers/optcgapi/fetch-image.js";

const VALID_IMAGE_URL =
	"https://optcgapi.com/media/static/Card_Images/OP01-001.jpg";

function fakeImageResponse(bytes: number, contentType = "image/jpeg") {
	const buffer = new Uint8Array(bytes);
	const blob = new Blob([buffer], { type: contentType });
	return new Response(blob, {
		status: 200,
		headers: { "content-type": contentType },
	});
}

test("parseOptcgImageUrl accepts valid optcgapi URLs", () => {
	const url = parseOptcgImageUrl(VALID_IMAGE_URL);
	assert.equal(url.hostname, "optcgapi.com");
	assert.equal(url.pathname, "/media/static/Card_Images/OP01-001.jpg");
});

test("parseOptcgImageUrl rejects non-optcgapi hosts", () => {
	assert.throws(
		() => parseOptcgImageUrl("https://evil.example/card.jpg"),
		/Expected an image URL on optcgapi.com/,
	);
});

test("parseOptcgImageUrl rejects paths outside the image directory", () => {
	assert.throws(
		() => parseOptcgImageUrl("https://optcgapi.com/api/sets/OP-01/"),
		/Image URL must live under/,
	);
});

test("parseOptcgImageUrl rejects malformed URLs", () => {
	assert.throws(() => parseOptcgImageUrl("not a url"), /Invalid image URL/);
});

test("fetchOptcgCardImage returns blob + metadata on success", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () => fakeImageResponse(1024)) as typeof fetch;
	try {
		const result = await fetchOptcgCardImage(VALID_IMAGE_URL);
		assert.equal(result.sizeBytes, 1024);
		assert.equal(result.contentType, "image/jpeg");
		assert.equal(result.filename, "OP01-001.jpg");
		assert.equal(result.sourceUrl, VALID_IMAGE_URL);
		assert.ok(result.blob);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("fetchOptcgCardImage throws on non-2xx response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 404 })) as typeof fetch;
	try {
		await assert.rejects(
			() => fetchOptcgCardImage(VALID_IMAGE_URL),
			/failed with 404/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("fetchOptcgCardImages fetches in parallel and preserves order", async () => {
	const originalFetch = globalThis.fetch;
	const sizeByFilename: Record<string, number> = {
		"OP01-001.jpg": 100,
		"OP01-002.jpg": 200,
		"OP01-003.jpg": 300,
	};
	let callCount = 0;
	globalThis.fetch = (async (input: string | URL | Request) => {
		callCount += 1;
		const filename = String(input).split("/").pop() ?? "";
		return fakeImageResponse(sizeByFilename[filename] ?? 0);
	}) as typeof fetch;
	try {
		const urls = [
			"https://optcgapi.com/media/static/Card_Images/OP01-001.jpg",
			"https://optcgapi.com/media/static/Card_Images/OP01-002.jpg",
			"https://optcgapi.com/media/static/Card_Images/OP01-003.jpg",
		];
		const results = await fetchOptcgCardImages(urls, { concurrency: 2 });
		assert.equal(callCount, 3);
		assert.equal(results.length, 3);
		assert.equal(results[0].filename, "OP01-001.jpg");
		assert.equal(results[1].filename, "OP01-002.jpg");
		assert.equal(results[2].filename, "OP01-003.jpg");
		assert.equal(results[0].sizeBytes, 100);
		assert.equal(results[1].sizeBytes, 200);
		assert.equal(results[2].sizeBytes, 300);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
