import assert from "node:assert/strict";
import test from "node:test";
import {
	latestOptcgSet,
	listAllOptcgSets,
	type OptcgRawSet,
	toSet,
} from "../src/providers/optcgapi/list-all-sets.js";

const sampleRaw: OptcgRawSet = { set_id: "OP-01", set_name: "Romance Dawn" };

test("toSet normalizes snake_case to camelCase", () => {
	const set = toSet(sampleRaw);
	assert.equal(set.setId, "OP-01");
	assert.equal(set.setName, "Romance Dawn");
});

test("listAllOptcgSets returns sets in order from the API", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/api\/allSets\/$/);
		return new Response(
			JSON.stringify([
				sampleRaw,
				{ set_id: "OP-02", set_name: "Paramount War" },
				{ set_id: "OP15-EB04", set_name: "Adventure on Kami's Island" },
			]),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
	}) as typeof fetch;
	try {
		const sets = await listAllOptcgSets();
		assert.equal(sets.length, 3);
		assert.equal(sets[0].setId, "OP-01");
		assert.equal(sets[2].setId, "OP15-EB04");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("latestOptcgSet returns the last entry", () => {
	const latest = latestOptcgSet([
		{ setId: "OP-01", setName: "Romance Dawn" },
		{ setId: "OP15-EB04", setName: "Adventure on Kami's Island" },
	]);
	assert.equal(latest?.setId, "OP15-EB04");
});

test("latestOptcgSet returns null for an empty list", () => {
	assert.equal(latestOptcgSet([]), null);
});

test("listAllOptcgSets throws on API error envelope", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ error: "Service down." }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		await assert.rejects(() => listAllOptcgSets(), /Service down/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("listAllOptcgSets throws on non-2xx response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 503 })) as typeof fetch;
	try {
		await assert.rejects(() => listAllOptcgSets(), /failed with 503/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
