import assert from "node:assert/strict";
import test from "node:test";
import {
	listTcgdexCategories,
	listTcgdexRarities,
	listTcgdexTypes,
} from "../src/providers/tcgdex/reference.js";

function stubFetch(
	body: unknown,
	status = 200,
	onUrl?: (url: string) => void,
): typeof fetch {
	return (async (input: string | URL | Request) => {
		onUrl?.(String(input));
		return new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
}

test("listTcgdexTypes returns the type list", async () => {
	const original = globalThis.fetch;
	let url = "";
	globalThis.fetch = stubFetch(
		[
			"Colorless",
			"Darkness",
			"Dragon",
			"Fairy",
			"Fighting",
			"Fire",
			"Grass",
			"Lightning",
			"Metal",
			"Psychic",
			"Water",
		],
		200,
		(u) => (url = u),
	);
	try {
		const types = await listTcgdexTypes();
		assert.match(url, /\/v2\/en\/types$/);
		assert.equal(types.length, 11);
		assert.ok(types.includes("Fire"));
	} finally {
		globalThis.fetch = original;
	}
});

test("listTcgdexRarities returns the rarity list", async () => {
	const original = globalThis.fetch;
	let url = "";
	globalThis.fetch = stubFetch(
		["Common", "Rare", "Holo Rare", "Holo Rare V", "Holo Rare VMAX"],
		200,
		(u) => (url = u),
	);
	try {
		const rarities = await listTcgdexRarities();
		assert.match(url, /\/v2\/en\/rarities$/);
		assert.ok(rarities.includes("Holo Rare V"));
	} finally {
		globalThis.fetch = original;
	}
});

test("listTcgdexCategories returns Energy/Pokemon/Trainer", async () => {
	const original = globalThis.fetch;
	let url = "";
	globalThis.fetch = stubFetch(
		["Energy", "Pokemon", "Trainer"],
		200,
		(u) => (url = u),
	);
	try {
		const categories = await listTcgdexCategories();
		assert.match(url, /\/v2\/en\/categories$/);
		assert.deepEqual(categories, ["Energy", "Pokemon", "Trainer"]);
	} finally {
		globalThis.fetch = original;
	}
});

test("listTcgdexTypes supports language override", async () => {
	const original = globalThis.fetch;
	let url = "";
	globalThis.fetch = stubFetch(["Incolore"], 200, (u) => (url = u));
	try {
		await listTcgdexTypes("fr");
		assert.match(url, /\/v2\/fr\/types$/);
	} finally {
		globalThis.fetch = original;
	}
});

test("reference endpoints throw on non-2xx", async () => {
	const original = globalThis.fetch;
	globalThis.fetch = stubFetch("", 500);
	try {
		await assert.rejects(() => listTcgdexTypes(), /failed with 500/);
	} finally {
		globalThis.fetch = original;
	}
});

test("reference endpoints throw on unexpected payload", async () => {
	const original = globalThis.fetch;
	globalThis.fetch = stubFetch({ error: "service down" });
	try {
		await assert.rejects(() => listTcgdexRarities(), /service down/);
	} finally {
		globalThis.fetch = original;
	}
});
