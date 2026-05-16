import assert from "node:assert/strict";
import test from "node:test";
import {
	findDuplicates,
	summarizeOwnedCards,
} from "../src/lib/collection.js";

const cards = [
	{
		ownerName: "Spencer",
		cardId: "OP05-119",
		cardName: "Monkey.D.Luffy",
		quantity: 2,
	},
	{
		ownerName: "Spencer",
		cardId: "OP01-001",
		cardName: "Roronoa Zoro",
		quantity: 1,
	},
	{
		ownerName: "Nami",
		cardId: "OP05-119",
		cardName: "Monkey.D.Luffy",
		quantity: 1,
	},
];

test("summarizes one owner's collection", () => {
	assert.deepEqual(summarizeOwnedCards("Spencer", cards), {
		ownerName: "Spencer",
		totalCopies: 3,
		uniqueCards: 2,
		duplicateCardCount: 1,
		topCardsByQuantity: [
			{
				cardId: "OP05-119",
				cardName: "Monkey.D.Luffy",
				quantity: 2,
			},
			{
				cardId: "OP01-001",
				cardName: "Roronoa Zoro",
				quantity: 1,
			},
		],
	});
});

test("finds duplicate cards per owner", () => {
	assert.deepEqual(findDuplicates("Spencer", cards), [
		{
			ownerName: "Spencer",
			cardId: "OP05-119",
			cardName: "Monkey.D.Luffy",
			quantity: 2,
		},
	]);
});
