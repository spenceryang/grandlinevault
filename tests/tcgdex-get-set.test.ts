import assert from "node:assert/strict";
import test from "node:test";
import {
	getTcgdexSet,
	listTcgdexSets,
	type TcgdexSetRaw,
	type TcgdexSetSummaryRaw,
	toSet,
	toSetSummary,
} from "../src/providers/tcgdex/get-set.js";

const sampleSummary: TcgdexSetSummaryRaw = {
	id: "base1",
	name: "Base Set",
	logo: "https://assets.tcgdex.net/en/base/base1/logo",
	cardCount: { total: 102, official: 102 },
};

const sampleSet: TcgdexSetRaw = {
	id: "swsh1",
	name: "Sword & Shield",
	logo: "https://assets.tcgdex.net/en/swsh/swsh1/logo",
	symbol: "https://assets.tcgdex.net/univ/swsh/swsh1/symbol",
	serie: { id: "swsh", name: "Sword & Shield" },
	releaseDate: "2020-02-07",
	legal: { standard: false, expanded: true },
	cardCount: {
		total: 216,
		official: 202,
		firstEd: 0,
		holo: 68,
		normal: 148,
		reverse: 164,
	},
	cards: [
		{
			id: "swsh1-1",
			localId: "1",
			name: "Celebi V",
			image: "https://assets.tcgdex.net/en/swsh/swsh1/1",
		},
		{ id: "swsh1-2", localId: "2", name: "Roselia" },
	],
};

test("toSetSummary normalizes the compact list shape", () => {
	const summary = toSetSummary(sampleSummary);
	assert.equal(summary.id, "base1");
	assert.equal(summary.name, "Base Set");
	assert.equal(summary.cardCount.total, 102);
	assert.equal(summary.cardCount.official, 102);
	assert.equal(summary.symbol, null);
});

test("toSet normalizes the full set with cards array", () => {
	const set = toSet(sampleSet);
	assert.equal(set.id, "swsh1");
	assert.equal(set.seriesId, "swsh");
	assert.equal(set.seriesName, "Sword & Shield");
	assert.equal(set.legalStandard, false);
	assert.equal(set.legalExpanded, true);
	assert.equal(set.cardCount.holo, 68);
	assert.equal(set.cardCount.reverse, 164);
	assert.equal(set.cards.length, 2);
	assert.equal(set.cards[0].imageUrl, "https://assets.tcgdex.net/en/swsh/swsh1/1");
	assert.equal(set.cards[1].imageUrl, null);
});

test("toSet handles missing optional fields", () => {
	const minimal: TcgdexSetRaw = {
		id: "x",
		name: "X",
		cardCount: { total: 0, official: 0 },
		cards: [],
	};
	const set = toSet(minimal);
	assert.equal(set.seriesId, null);
	assert.equal(set.releaseDate, null);
	assert.equal(set.legalStandard, false);
	assert.equal(set.cardCount.holo, null);
});

test("getTcgdexSet hits the localized sets endpoint", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify(sampleSet), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const set = await getTcgdexSet("swsh1");
		assert.match(capturedUrl, /\/v2\/en\/sets\/swsh1$/);
		assert.equal(set.id, "swsh1");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSet supports language override", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify(sampleSet), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await getTcgdexSet("swsh1", "ja");
		assert.match(capturedUrl, /\/v2\/ja\/sets\/swsh1$/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSet surfaces 404", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 404 })) as typeof fetch;
	try {
		await assert.rejects(() => getTcgdexSet("zzz999"), /not found/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSet rejects empty setId", async () => {
	await assert.rejects(() => getTcgdexSet("   "), /must not be empty/);
});

test("listTcgdexSets returns parsed summaries", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/v2\/en\/sets$/);
		return new Response(JSON.stringify([sampleSummary]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const sets = await listTcgdexSets();
		assert.equal(sets.length, 1);
		assert.equal(sets[0].id, "base1");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSet throws on non-2xx (non-404)", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 502 })) as typeof fetch;
	try {
		await assert.rejects(() => getTcgdexSet("swsh1"), /failed with 502/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
