import assert from "node:assert/strict";
import test from "node:test";
import {
	getOptcgCard,
	type OptcgRawCard,
	toCardVariant,
} from "../src/providers/optcgapi/get-card.js";

const sampleRaw: OptcgRawCard = {
	inventory_price: 2.5,
	market_price: 2.97,
	card_name: "Roronoa Zoro (001)",
	set_name: "Romance Dawn",
	card_text: "[DON!! x1] [Your Turn] All of your Characters gain +1000 power.",
	set_id: "OP-01",
	rarity: "L",
	card_set_id: "OP01-001",
	card_color: "Red",
	card_type: "Leader",
	life: "5",
	card_cost: null,
	card_power: "5000",
	sub_types: "Straw Hat Crew Supernovas",
	counter_amount: null,
	attribute: "Slash",
	date_scraped: "2026-05-16",
	card_image_id: "OP01-001",
	card_image: "https://optcgapi.com/media/static/Card_Images/OP01-001.jpg",
};

test("toCardVariant normalizes Leader card fields", () => {
	const variant = toCardVariant(sampleRaw);
	assert.equal(variant.cardSetId, "OP01-001");
	assert.equal(variant.cardImageId, "OP01-001");
	assert.equal(variant.name, "Roronoa Zoro (001)");
	assert.equal(variant.cardType, "Leader");
	assert.equal(variant.color, "Red");
	assert.equal(variant.power, 5000);
	assert.equal(variant.life, 5);
	assert.equal(variant.cost, null);
	assert.equal(variant.counter, null);
	assert.equal(variant.marketPrice, 2.97);
});

test("toCardVariant parses Character cost and counter", () => {
	const variant = toCardVariant({
		...sampleRaw,
		card_set_id: "OP01-015",
		card_image_id: "OP01-015",
		card_name: "Tony Tony.Chopper",
		card_type: "Character",
		rarity: "UC",
		card_cost: "3",
		card_power: "4000",
		counter_amount: 1000,
		life: null,
		sub_types: "Animal Straw Hat Crew",
	});
	assert.equal(variant.cost, 3);
	assert.equal(variant.power, 4000);
	assert.equal(variant.counter, 1000);
	assert.equal(variant.life, null);
});

test("toCardVariant returns null for empty numeric strings", () => {
	const variant = toCardVariant({ ...sampleRaw, card_power: "" });
	assert.equal(variant.power, null);
});

test("getOptcgCard returns variants on successful response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify([sampleRaw, { ...sampleRaw, card_image_id: "OP01-001_p1", market_price: 556.77 }]), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		const variants = await getOptcgCard("OP01-001");
		assert.equal(variants.length, 2);
		assert.equal(variants[0].cardImageId, "OP01-001");
		assert.equal(variants[1].cardImageId, "OP01-001_p1");
		assert.equal(variants[1].marketPrice, 556.77);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgCard throws when API returns error object", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ error: "Card not found." }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		await assert.rejects(
			() => getOptcgCard("ZZ99-999"),
			/Card not found/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgCard throws when fetch is not ok", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 500 })) as typeof fetch;
	try {
		await assert.rejects(
			() => getOptcgCard("OP01-001"),
			/failed with 500/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgCard rejects empty cardSetId", async () => {
	await assert.rejects(() => getOptcgCard("   "), /must not be empty/);
});
