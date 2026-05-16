import assert from "node:assert/strict";
import test from "node:test";
import {
	filterOptcgPromoCards,
	getOptcgPromoCard,
	type OptcgPromoRaw,
	toPromoCard,
} from "../src/providers/optcgapi/promos.js";

const samplePromo: OptcgPromoRaw = {
	inventory_price: 19.0,
	market_price: 111.56,
	card_name: "Monkey.D.Luffy (Alternate Art)",
	set_name: "One Piece Promotion Cards",
	card_text: "[DON!! x2] This Character gains [Rush].",
	set_id: "P",
	rarity: "P",
	card_set_id: "P-001",
	card_color: "Red",
	card_type: "Character",
	life: null,
	card_cost: "5",
	card_power: "6000",
	sub_types: "Straw Hat Crew Supernovas",
	counter_amount: 1000,
	attribute: "Strike",
	date_scraped: "2026-05-16",
	card_image_id: "P-001",
	card_image: "https://optcgapi.com/media/static/Card_Images/P-001.jpg",
};

test("toPromoCard normalizes promo card record", () => {
	const promo = toPromoCard(samplePromo);
	assert.equal(promo.cardSetId, "P-001");
	assert.equal(promo.collectionName, "One Piece Promotion Cards");
	assert.equal(promo.collectionId, "P");
	assert.equal(promo.cost, 5);
	assert.equal(promo.power, 6000);
	assert.equal(promo.counter, 1000);
	assert.equal(promo.marketPrice, 111.56);
});

test("getOptcgPromoCard fetches and uppercases input", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([samplePromo]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const variants = await getOptcgPromoCard("p-001");
		assert.match(capturedUrl, /\/promos\/card\/P-001\/$/);
		assert.equal(variants.length, 1);
		assert.equal(variants[0].cardSetId, "P-001");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgPromoCard throws on the upstream Error! envelope", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ "Error!": "No card was found for this endpoint and card set ID!" }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		await assert.rejects(
			() => getOptcgPromoCard("ZZ-999"),
			/No card was found/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgPromoCard rejects empty cardSetId", async () => {
	await assert.rejects(() => getOptcgPromoCard("   "), /must not be empty/);
});

test("filterOptcgPromoCards builds query string and returns results", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([samplePromo]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const promos = await filterOptcgPromoCards({
			color: "Red",
			rarity: "P",
		});
		assert.match(capturedUrl, /color=Red/);
		assert.match(capturedUrl, /rarity=P/);
		assert.equal(promos.length, 1);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgPromoCards rejects empty filter set", async () => {
	await assert.rejects(
		() => filterOptcgPromoCards({}),
		/At least one filter/,
	);
});

test("filterOptcgPromoCards passes cardName through", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([samplePromo]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await filterOptcgPromoCards({ cardName: "Luffy" });
		assert.match(capturedUrl, /card_name=Luffy/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgPromoCards throws on non-2xx response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 500 })) as typeof fetch;
	try {
		await assert.rejects(
			() => filterOptcgPromoCards({ color: "Red" }),
			/failed with 500/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
