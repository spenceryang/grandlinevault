import assert from "node:assert/strict";
import test from "node:test";
import {
	getOptcgSet,
	type OptcgRawCard,
	toSetCard,
} from "../src/providers/optcgapi/get-set.js";

const sampleRaw: OptcgRawCard = {
	inventory_price: 0.99,
	market_price: 0.9,
	card_name: "Perona",
	set_name: "Romance Dawn",
	card_text:
		"[On Play] Look at 5 cards from the top of your deck and place them at the top or bottom of the deck in any order.",
	set_id: "OP-01",
	rarity: "UC",
	card_set_id: "OP01-077",
	card_color: "Blue",
	card_type: "Character",
	life: null,
	card_cost: "1",
	card_power: "2000",
	sub_types: "Thriller Bark Pirates",
	counter_amount: 1000,
	attribute: "Special",
	date_scraped: "2026-05-16",
	card_image_id: "OP01-077",
	card_image: "https://optcgapi.com/media/static/Card_Images/OP01-077.jpg",
};

test("toSetCard preserves card identity and parses numerics", () => {
	const card = toSetCard(sampleRaw);
	assert.equal(card.cardSetId, "OP01-077");
	assert.equal(card.cardImageId, "OP01-077");
	assert.equal(card.cost, 1);
	assert.equal(card.power, 2000);
	assert.equal(card.counter, 1000);
	assert.equal(card.life, null);
});

test("getOptcgSet returns array of cards on success", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/api\/sets\/OP-01\/$/);
		return new Response(
			JSON.stringify([sampleRaw, { ...sampleRaw, card_set_id: "OP01-078", card_image_id: "OP01-078" }]),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
	}) as typeof fetch;
	try {
		const cards = await getOptcgSet("op-01");
		assert.equal(cards.length, 2);
		assert.equal(cards[0].cardSetId, "OP01-077");
		assert.equal(cards[1].cardSetId, "OP01-078");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgSet throws when the set is missing", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ error: "Set not found." }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		await assert.rejects(() => getOptcgSet("ZZ-99"), /Set not found/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgSet throws on non-2xx response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 500 })) as typeof fetch;
	try {
		await assert.rejects(() => getOptcgSet("OP-01"), /failed with 500/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgSet rejects empty setId", async () => {
	await assert.rejects(() => getOptcgSet("   "), /must not be empty/);
});
