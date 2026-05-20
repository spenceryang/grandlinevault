import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCollectionPage, summarizeCollection } from "../src/vercel/collection-view.js";
import { normalizeTcgdexImageUrl } from "../src/vercel/pokemon.js";

test("normalizeCollectionPage reads select/rich text fields and infers Pokemon", () => {
	const card = normalizeCollectionPage({
		id: "page-1",
		url: "https://notion.so/page-1",
		properties: {
			Name: { type: "title", title: [{ plain_text: "Celebi V" }] },
			Owner: { type: "select", select: { name: "Spencer" } },
			"Card ID": { type: "rich_text", rich_text: [{ plain_text: "swsh1-1" }] },
			Set: { type: "select", select: { name: "Sword & Shield" } },
			Rarity: { type: "rich_text", rich_text: [{ plain_text: "Holo Rare V" }] },
			Color: { type: "multi_select", multi_select: [{ name: "Grass" }] },
			Quantity: { type: "number", number: 2 },
			"Market Price": { type: "number", number: 4.25 },
			"Card Image": {
				type: "files",
				files: [{ type: "external", external: { url: "https://example.com/card.png" } }],
			},
		},
	});

	assert.equal(card?.game, "Pokemon");
	assert.equal(card?.owner, "Spencer");
	assert.equal(card?.quantity, 2);
	assert.equal(card?.imageUrl, "https://example.com/card.png");
});

test("summarizeCollection totals quantity and value", () => {
	const summary = summarizeCollection([
		{
			id: "1",
			pageUrl: null,
			name: "A",
			owner: "Spencer",
			cardId: "OP01-001",
			game: "One Piece",
			set: null,
			rarity: null,
			color: null,
			type: null,
			quantity: 2,
			marketPrice: 3,
			imageUrl: null,
			tags: [],
		},
		{
			id: "2",
			pageUrl: null,
			name: "B",
			owner: "Jarren",
			cardId: "swsh1-1",
			game: "Pokemon",
			set: null,
			rarity: null,
			color: null,
			type: null,
			quantity: 1,
			marketPrice: 4.5,
			imageUrl: null,
			tags: [],
		},
	]);

	assert.equal(summary.totalQuantity, 3);
	assert.equal(summary.totalMarketValue, 10.5);
	assert.equal(summary.games[0].label, "One Piece");
});

test("normalizeTcgdexImageUrl appends high resolution asset path", () => {
	assert.equal(
		normalizeTcgdexImageUrl("https://assets.tcgdex.net/en/swsh/swsh1/1"),
		"https://assets.tcgdex.net/en/swsh/swsh1/1/high.png",
	);
	assert.equal(normalizeTcgdexImageUrl("https://example.com/card.png"), "https://example.com/card.png");
});
