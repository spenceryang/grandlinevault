import assert from "node:assert/strict";
import test from "node:test";
import {
	getTcgdexSeries,
	listTcgdexSeries,
	type TcgdexSeriesRaw,
	type TcgdexSeriesSummaryRaw,
	toSeries,
	toSeriesSummary,
} from "../src/providers/tcgdex/get-series.js";

const sampleSummary: TcgdexSeriesSummaryRaw = {
	id: "swsh",
	name: "Sword & Shield",
	logo: "https://assets.tcgdex.net/en/swsh/swsh1/logo",
};

const sampleSeries: TcgdexSeriesRaw = {
	id: "swsh",
	name: "Sword & Shield",
	logo: "https://assets.tcgdex.net/en/swsh/swsh1/logo",
	releaseDate: "2019-11-15",
	firstSet: {
		id: "swshp",
		name: "SWSH Black Star Promos",
		logo: "https://assets.tcgdex.net/en/swsh/swshp/logo",
		symbol: "https://assets.tcgdex.net/univ/swsh/swshp/symbol",
		cardCount: { total: 307, official: 307 },
	},
	lastSet: {
		id: "swsh12.5",
		name: "Crown Zenith",
		logo: "https://assets.tcgdex.net/en/swsh/swsh12.5/logo",
		symbol: "https://assets.tcgdex.net/univ/swsh/swsh12.5/symbol",
		cardCount: { total: 230, official: 159 },
	},
	sets: [
		{
			id: "swshp",
			name: "SWSH Black Star Promos",
			cardCount: { total: 307, official: 307 },
		},
		{
			id: "swsh1",
			name: "Sword & Shield",
			cardCount: { total: 216, official: 202 },
		},
	],
};

test("toSeriesSummary normalizes a series summary", () => {
	const s = toSeriesSummary(sampleSummary);
	assert.equal(s.id, "swsh");
	assert.equal(s.name, "Sword & Shield");
	assert.equal(s.logo, "https://assets.tcgdex.net/en/swsh/swsh1/logo");

	const noLogo = toSeriesSummary({ id: "misc", name: "Miscellaneous" });
	assert.equal(noLogo.logo, null);
});

test("toSeries normalizes the full series with first/last/all sets", () => {
	const series = toSeries(sampleSeries);
	assert.equal(series.id, "swsh");
	assert.equal(series.releaseDate, "2019-11-15");
	assert.equal(series.firstSet?.id, "swshp");
	assert.equal(series.lastSet?.id, "swsh12.5");
	assert.equal(series.lastSet?.cardCount.total, 230);
	assert.equal(series.sets.length, 2);
	assert.equal(series.sets[1].id, "swsh1");
});

test("toSeries handles missing optional fields", () => {
	const minimal: TcgdexSeriesRaw = { id: "misc", name: "Miscellaneous" };
	const series = toSeries(minimal);
	assert.equal(series.releaseDate, null);
	assert.equal(series.firstSet, null);
	assert.equal(series.lastSet, null);
	assert.deepEqual(series.sets, []);
});

test("getTcgdexSeries hits the localized series endpoint", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify(sampleSeries), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const series = await getTcgdexSeries("swsh");
		assert.match(capturedUrl, /\/v2\/en\/series\/swsh$/);
		assert.equal(series.id, "swsh");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSeries supports language override", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify(sampleSeries), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await getTcgdexSeries("swsh", "de");
		assert.match(capturedUrl, /\/v2\/de\/series\/swsh$/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSeries surfaces 404 with descriptive error", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 404 })) as typeof fetch;
	try {
		await assert.rejects(() => getTcgdexSeries("zzz"), /not found/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSeries rejects empty seriesId", async () => {
	await assert.rejects(() => getTcgdexSeries("   "), /must not be empty/);
});

test("listTcgdexSeries returns parsed summaries", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/v2\/en\/series$/);
		return new Response(JSON.stringify([sampleSummary]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const series = await listTcgdexSeries();
		assert.equal(series.length, 1);
		assert.equal(series[0].id, "swsh");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexSeries throws on non-2xx (non-404)", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 500 })) as typeof fetch;
	try {
		await assert.rejects(() => getTcgdexSeries("swsh"), /failed with 500/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
