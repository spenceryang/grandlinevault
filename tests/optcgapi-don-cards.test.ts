import assert from "node:assert/strict";
import test from "node:test";
import {
	listAllOptcgDonCards,
	type OptcgDonCardRaw,
	toDonCard,
} from "../src/providers/optcgapi/don-cards.js";

const sampleDon: OptcgDonCardRaw = {
	inventory_price: 0.12,
	market_price: 0.38,
	card_name: "DON!! Card (Egghead)",
	card_text: "Your Turn +1000",
	rarity: "DON!!",
	card_type: "DON!!",
	don_id: null,
	date_scraped: "2026-05-16",
	card_image_id: "don_1",
	card_image:
		"https://optcgapi.com/media/static/Card_Images/DON_Card_Egghead_-_The_Azure_Seas_Seven_OP14_img.jpg",
	optcg_don_name: "DON!! Card (Egghead) - The Azure Sea's Seven (OP14)",
};

test("toDonCard normalizes a DON!! card record", () => {
	const don = toDonCard(sampleDon);
	assert.equal(don.cardImageId, "don_1");
	assert.equal(don.name, "DON!! Card (Egghead)");
	assert.equal(
		don.fullName,
		"DON!! Card (Egghead) - The Azure Sea's Seven (OP14)",
	);
	assert.equal(don.rarity, "DON!!");
	assert.equal(don.cardType, "DON!!");
	assert.equal(don.marketPrice, 0.38);
});

test("listAllOptcgDonCards returns parsed DON cards", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/api\/allDonCards\/$/);
		return new Response(
			JSON.stringify([
				sampleDon,
				{ ...sampleDon, card_image_id: "don_2", card_name: "DON!! Card (Mihawk)" },
			]),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
	}) as typeof fetch;
	try {
		const cards = await listAllOptcgDonCards();
		assert.equal(cards.length, 2);
		assert.equal(cards[0].cardImageId, "don_1");
		assert.equal(cards[1].name, "DON!! Card (Mihawk)");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("listAllOptcgDonCards throws on API error envelope", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ error: "Service unavailable." }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		await assert.rejects(() => listAllOptcgDonCards(), /Service unavailable/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("listAllOptcgDonCards throws on non-2xx response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 502 })) as typeof fetch;
	try {
		await assert.rejects(() => listAllOptcgDonCards(), /failed with 502/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
