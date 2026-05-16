import assert from "node:assert/strict";
import test from "node:test";
import {
	groupCardsBySet,
	listAllOptcgSetCards,
	type OptcgRawSetCard,
	toGlobalCard,
} from "../src/providers/optcgapi/list-all-set-cards.js";

const sampleRaw: OptcgRawSetCard = {
	inventory_price: 0.99,
	market_price: 0.9,
	card_name: "Perona",
	set_name: "Romance Dawn",
	card_text: "[On Play] Look at 5 cards.",
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

test("toGlobalCard normalizes card fields", () => {
	const card = toGlobalCard(sampleRaw);
	assert.equal(card.cardSetId, "OP01-077");
	assert.equal(card.setId, "OP-01");
	assert.equal(card.cost, 1);
	assert.equal(card.power, 2000);
	assert.equal(card.counter, 1000);
});

test("listAllOptcgSetCards returns parsed cards", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/api\/allSetCards\/$/);
		return new Response(
			JSON.stringify([
				sampleRaw,
				{ ...sampleRaw, set_id: "OP-02", card_set_id: "OP02-001", card_image_id: "OP02-001" },
			]),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
	}) as typeof fetch;
	try {
		const cards = await listAllOptcgSetCards();
		assert.equal(cards.length, 2);
		assert.equal(cards[0].setId, "OP-01");
		assert.equal(cards[1].setId, "OP-02");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("groupCardsBySet keys by set id, preserves order", () => {
	const cards = [
		toGlobalCard(sampleRaw),
		toGlobalCard({ ...sampleRaw, card_set_id: "OP01-078", card_image_id: "OP01-078" }),
		toGlobalCard({ ...sampleRaw, set_id: "OP-02", card_set_id: "OP02-001", card_image_id: "OP02-001" }),
	];
	const grouped = groupCardsBySet(cards);
	assert.equal(grouped.size, 2);
	assert.equal(grouped.get("OP-01")?.length, 2);
	assert.equal(grouped.get("OP-02")?.length, 1);
});

test("groupCardsBySet falls back to UNKNOWN bucket for missing setId", () => {
	const cards = [toGlobalCard({ ...sampleRaw, set_id: null })];
	const grouped = groupCardsBySet(cards);
	assert.equal(grouped.get("UNKNOWN")?.length, 1);
});

test("listAllOptcgSetCards throws on non-2xx", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 500 })) as typeof fetch;
	try {
		await assert.rejects(() => listAllOptcgSetCards(), /failed with 500/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("listAllOptcgSetCards throws on API error envelope", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ error: "Service unavailable." }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		await assert.rejects(() => listAllOptcgSetCards(), /Service unavailable/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
