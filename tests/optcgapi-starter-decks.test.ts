import assert from "node:assert/strict";
import test from "node:test";
import {
	filterOptcgStarterCards,
	getOptcgStarterCard,
	getOptcgStarterDeck,
	listAllOptcgStarterCards,
	listAllOptcgStarterDecks,
	type OptcgStarterCardRaw,
	type OptcgStarterDeckRaw,
	toStarterCard,
	toStarterDeck,
} from "../src/providers/optcgapi/starter-decks.js";

const sampleDeck: OptcgStarterDeckRaw = {
	structure_deck_id: "ST-01",
	structure_deck_name: "Starter Deck 1: Straw Hat Crew",
};

const sampleCard: OptcgStarterCardRaw = {
	inventory_price: 14.99,
	market_price: 35.53,
	card_name: "Monkey.D.Luffy (001)",
	set_name: "Starter Deck 1: Straw Hat Crew",
	card_text: "[Activate: Main] [Once Per Turn] Give up to 1 of your Characters +1000 power for this turn.",
	set_id: "ST-01",
	rarity: "L",
	card_set_id: "ST01-001",
	card_color: "Red",
	card_type: "Leader",
	life: "5",
	card_cost: null,
	card_power: "5000",
	sub_types: "Straw Hat Crew Supernovas",
	counter_amount: null,
	attribute: "Strike",
	date_scraped: "2026-05-16",
	card_image_id: "ST01-001",
	card_image: "https://optcgapi.com/media/static/Card_Images/ST01-001.jpg",
};

test("toStarterDeck normalizes deck record", () => {
	const deck = toStarterDeck(sampleDeck);
	assert.equal(deck.structureDeckId, "ST-01");
	assert.equal(deck.structureDeckName, "Starter Deck 1: Straw Hat Crew");
});

test("toStarterCard normalizes card record", () => {
	const card = toStarterCard(sampleCard);
	assert.equal(card.cardSetId, "ST01-001");
	assert.equal(card.cardType, "Leader");
	assert.equal(card.power, 5000);
	assert.equal(card.life, 5);
	assert.equal(card.cost, null);
	assert.equal(card.deckId, "ST-01");
});

test("listAllOptcgStarterDecks returns parsed deck list", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/api\/allDecks\/$/);
		return new Response(JSON.stringify([sampleDeck]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const decks = await listAllOptcgStarterDecks();
		assert.equal(decks.length, 1);
		assert.equal(decks[0].structureDeckId, "ST-01");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgStarterDeck fetches cards in a deck and uppercases input", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([sampleCard]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const cards = await getOptcgStarterDeck("st-01");
		assert.match(capturedUrl, /\/decks\/ST-01\/$/);
		assert.equal(cards.length, 1);
		assert.equal(cards[0].cardSetId, "ST01-001");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgStarterCard returns variants and rejects empty id", async () => {
	await assert.rejects(() => getOptcgStarterCard("   "), /must not be empty/);
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify([sampleCard]), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
	try {
		const variants = await getOptcgStarterCard("ST01-001");
		assert.equal(variants.length, 1);
		assert.equal(variants[0].name, "Monkey.D.Luffy (001)");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgStarterCards builds query string and parses results", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([sampleCard]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const cards = await filterOptcgStarterCards({
			color: "Red",
			cardType: "Leader",
		});
		assert.match(capturedUrl, /color=Red/);
		assert.match(capturedUrl, /card_type=Leader/);
		assert.equal(cards.length, 1);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgStarterCards passes cardName through", async () => {
	const originalFetch = globalThis.fetch;
	let capturedUrl = "";
	globalThis.fetch = (async (input: string | URL | Request) => {
		capturedUrl = String(input);
		return new Response(JSON.stringify([sampleCard]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		await filterOptcgStarterCards({ cardName: "Luffy" });
		assert.match(capturedUrl, /card_name=Luffy/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("filterOptcgStarterCards rejects when no filters provided", async () => {
	await assert.rejects(
		() => filterOptcgStarterCards({}),
		/At least one filter/,
	);
});

test("listAllOptcgStarterCards returns parsed list", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL | Request) => {
		assert.match(String(input), /\/api\/allSTCards\/$/);
		return new Response(JSON.stringify([sampleCard, { ...sampleCard, card_set_id: "ST01-002", card_image_id: "ST01-002" }]), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	try {
		const cards = await listAllOptcgStarterCards();
		assert.equal(cards.length, 2);
		assert.equal(cards[1].cardSetId, "ST01-002");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("getOptcgStarterDeck throws on non-2xx", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response("", { status: 503 })) as typeof fetch;
	try {
		await assert.rejects(() => getOptcgStarterDeck("ST-01"), /failed with 503/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
