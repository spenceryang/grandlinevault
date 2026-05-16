import assert from "node:assert/strict";
import test from "node:test";
import {
	filterOptcgCards,
	type OptcgRawCard,
} from "../src/providers/optcgapi/filter-cards.js";

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

test("filterOptcgCards builds query string and parses results", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([sampleRaw]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const cards = await filterOptcgCards({
			color: "Red",
			cardType: "Leader",
		});
		assert.match(capturedUrl, /color=Red/);
		assert.match(capturedUrl, /card_type=Leader/);
		assert.equal(cards.length, 1);
		assert.equal(cards[0].cardSetId, "OP01-001");
		assert.equal(cards[0].power, 5000);
		assert.equal(cards[0].life, 5);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgCards passes cost and rarity filters", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await filterOptcgCards({ cost: "3", rarity: "SR" });
		assert.match(capturedUrl, /card_cost=3/);
		assert.match(capturedUrl, /rarity=SR/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgCards rejects when no filters are provided", async () => {
	await assert.rejects(
		() => filterOptcgCards({}),
		/At least one filter/,
	);
});

test("filterOptcgCards passes cardName through to the server", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([sampleRaw]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await filterOptcgCards({ cardName: "Zoro", color: "Red" });
		assert.match(capturedUrl, /card_name=Zoro/);
		assert.match(capturedUrl, /color=Red/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgCards accepts cardName as the only filter", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify([sampleRaw]), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		const cards = await filterOptcgCards({ cardName: "Luffy" });
		assert.equal(cards.length, 1);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgCards throws on API error envelope", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ error: "No matches." }), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		await assert.rejects(
			() => filterOptcgCards({ color: "Rainbow" }),
			/No matches/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgCards throws on non-2xx response", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 500 })) as typeof fetch;
	try {
		await assert.rejects(
			() => filterOptcgCards({ color: "Red" }),
			/failed with 500/,
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
