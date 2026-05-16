import assert from "node:assert/strict";
import test from "node:test";
import {
	getTcgdexCard,
	listTcgdexCards,
	searchTcgdexCardsByName,
	type TcgdexCardRaw,
	type TcgdexCardSummary,
	toCard,
	toCardSummary,
} from "../src/providers/tcgdex/get-card.js";

const sampleRaw: TcgdexCardRaw = {
	category: "Pokemon",
	id: "swsh1-1",
	illustrator: "PLANETA Igarashi",
	image: "https://assets.tcgdex.net/en/swsh/swsh1/1",
	localId: "1",
	name: "Celebi V",
	rarity: "Holo Rare V",
	set: {
		id: "swsh1",
		name: "Sword & Shield",
		logo: "https://assets.tcgdex.net/en/swsh/swsh1/logo",
		symbol: "https://assets.tcgdex.net/univ/swsh/swsh1/symbol",
		cardCount: { official: 202, total: 216 },
	},
	hp: 180,
	types: ["Grass"],
	stage: "Basic",
	retreat: 1,
	regulationMark: "D",
	dexId: [251],
	attacks: [
		{
			name: "Find a Friend",
			cost: ["Colorless"],
			damage: 10,
			effect: "Search your deck for a Pokemon and put it into your hand.",
		},
	],
	weaknesses: [{ type: "Fire", value: "×2" }],
	variants: { firstEdition: false, holo: true, normal: false, reverse: false, wPromo: false },
};

const sampleSummary: TcgdexCardSummary = {
	id: "swsh1-1",
	localId: "1",
	name: "Celebi V",
	image: "https://assets.tcgdex.net/en/swsh/swsh1/1",
};

test("toCard normalizes a full card record", () => {
	const card = toCard(sampleRaw);
	assert.equal(card.id, "swsh1-1");
	assert.equal(card.setId, "swsh1");
	assert.equal(card.setName, "Sword & Shield");
	assert.equal(card.category, "Pokemon");
	assert.equal(card.hp, 180);
	assert.deepEqual(card.types, ["Grass"]);
	assert.equal(card.attacks[0].damage, "10");
	assert.equal(card.weaknesses[0].type, "Fire");
	assert.equal(card.variants.holo, true);
});

test("toCard handles missing optional fields", () => {
	const minimal: TcgdexCardRaw = { id: "exu-test", localId: "test", name: "Unown" };
	const card = toCard(minimal);
	assert.equal(card.setId, null);
	assert.equal(card.hp, null);
	assert.deepEqual(card.types, []);
	assert.deepEqual(card.attacks, []);
	assert.equal(card.variants.holo, false);
});

test("toCardSummary normalizes summary records", () => {
	const s = toCardSummary(sampleSummary);
	assert.equal(s.id, "swsh1-1");
	assert.equal(s.image, "https://assets.tcgdex.net/en/swsh/swsh1/1");

	const noImage = toCardSummary({ ...sampleSummary, image: undefined });
	assert.equal(noImage.image, null);
});

test("getTcgdexCard fetches by id with default English language", async () => {
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
		const card = await getTcgdexCard("swsh1-1");
		assert.match(capturedUrl, /\/v2\/en\/cards\/swsh1-1$/);
		assert.equal(card.id, "swsh1-1");
		assert.equal(card.hp, 180);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexCard uses requested language", async () => {
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
		await getTcgdexCard("swsh1-1", "fr");
		assert.match(capturedUrl, /\/v2\/fr\/cards\/swsh1-1$/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexCard surfaces 404 with descriptive error", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 404 })) as typeof fetch;
	try {
		await assert.rejects(() => getTcgdexCard("zzz-999"), /not found/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getTcgdexCard rejects empty id", async () => {
	await assert.rejects(() => getTcgdexCard("   "), /must not be empty/);
});

test("listTcgdexCards returns card summaries", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/v2\/en\/cards$/);
		return new Response(JSON.stringify([sampleSummary]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const cards = await listTcgdexCards();
		assert.equal(cards.length, 1);
		assert.equal(cards[0].id, "swsh1-1");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("searchTcgdexCardsByName encodes the name parameter", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([sampleSummary]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await searchTcgdexCardsByName("Mr. Mime");
		assert.match(capturedUrl, /name=Mr\.%20Mime/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("searchTcgdexCardsByName rejects empty query", async () => {
	await assert.rejects(() => searchTcgdexCardsByName("   "), /must not be empty/);
});

test("getTcgdexCard throws on non-2xx (non-404) response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 503 })) as typeof fetch;
	try {
		await assert.rejects(() => getTcgdexCard("swsh1-1"), /failed with 503/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
