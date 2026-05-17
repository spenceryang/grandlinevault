import assert from "node:assert/strict";
import test from "node:test";
import {
	battleRunMarkdown,
	buildBattleDeck,
	deckListMarkdown,
	normalizeCardType,
	simulateBattle,
	splitColors,
	type BattleOwnedCard,
} from "../src/lib/op-battle.js";

const cards: BattleOwnedCard[] = [
	leader("Spencer", "ST01-001", "Monkey.D.Luffy", "Red", 5000, 1),
	leader("Spencer", "ST04-001", "Kaido", "Purple", 5000, 1, 12),
	...main("Spencer", "ST04", "Purple", 17, "SR", 2),
	...main("Spencer", "ST01", "Red", 17, "C", 2),
	leader("Jarren", "ST02-001", "Eustass Captain Kid", "Green", 5000, 1),
	...main("Jarren", "ST02", "Green", 17, "SR", 3),
];

test("normalizeCardType maps official card types", () => {
	assert.equal(normalizeCardType("Leader"), "Leader");
	assert.equal(normalizeCardType("DON!!"), "DON");
	assert.equal(normalizeCardType("mystery"), "Unknown");
});

test("splitColors handles multi-color strings", () => {
	assert.deepEqual(splitColors("Red/Green Blue"), ["Red", "Green", "Blue"]);
});

test("buildBattleDeck chooses a leader and builds a 50-card main deck", () => {
	const deck = buildBattleDeck("Spencer", cards, {
		strategy: "strongest",
		now: new Date("2026-05-17T00:00:00Z"),
	});
	assert.equal(deck.ownerName, "Spencer");
	assert.equal(deck.mainDeck.length, 50);
	assert.ok(deck.estimatedStrength > 0);
	assert.equal(deck.deckId.includes("spencer"), true);
});

test("buildBattleDeck applies strategy bonuses", () => {
	const deck = buildBattleDeck("Spencer", cards, {
		strategy: "animal-kingdom",
		now: new Date("2026-05-17T00:00:00Z"),
	});
	assert.equal(deck.leader.cardName, "Kaido");
	assert.equal(deck.colors.includes("Purple"), true);
});

test("buildBattleDeck throws when owner has no leader", () => {
	assert.throws(() => buildBattleDeck("waffle", cards), /No Leader/);
});

test("simulateBattle runs requested Monte Carlo count", () => {
	const spencer = buildBattleDeck("Spencer", cards, {
		strategy: "animal-kingdom",
		now: new Date("2026-05-17T00:00:00Z"),
	});
	const jarren = buildBattleDeck("Jarren", cards, {
		strategy: "worst-generation",
		now: new Date("2026-05-17T00:00:00Z"),
	});
	const result = simulateBattle(spencer, jarren, {
		runs: 100,
		seed: 42,
		now: new Date("2026-05-17T00:00:00Z"),
	});
	assert.equal(result.simulations, 100);
	assert.equal(result.aWins + result.bWins + result.draws, 100);
	assert.ok(result.keyFactors.length >= 3);
	assert.equal(result.modelLimitations.some((line) => line.includes("Official-rule-informed")), true);
});

test("markdown helpers include permanent deck and run summaries", () => {
	const spencer = buildBattleDeck("Spencer", cards, {
		now: new Date("2026-05-17T00:00:00Z"),
	});
	const jarren = buildBattleDeck("Jarren", cards, {
		now: new Date("2026-05-17T00:00:00Z"),
	});
	const result = simulateBattle(spencer, jarren, { seed: 7 });
	assert.match(deckListMarkdown(spencer), /Main deck/);
	assert.match(battleRunMarkdown(result), /Model limitations/);
});

function leader(
	ownerName: string,
	cardId: string,
	cardName: string,
	color: string,
	power: number,
	quantity: number,
	marketPrice = 5,
): BattleOwnedCard {
	return {
		ownerName,
		cardId,
		cardName,
		color,
		power,
		quantity,
		cardType: "Leader",
		rarity: "L",
		marketPrice,
	};
}

function main(
	ownerName: string,
	prefix: string,
	color: string,
	count: number,
	rarity: string,
	costOffset: number,
): BattleOwnedCard[] {
	return Array.from({ length: count }, (_, index) => ({
		ownerName,
		cardId: `${prefix}-${String(index + 2).padStart(3, "0")}`,
		cardName: `${prefix} Card ${index + 2}`,
		quantity: index % 5 === 0 ? 2 : 4,
		cardType: index % 6 === 0 ? "Event" : "Character",
		color,
		cost: (index % 7) + costOffset,
		power: 2000 + (index % 6) * 1000,
		counter: index % 3 === 0 ? 1000 : 0,
		rarity,
		marketPrice: 1 + index,
		setCode: prefix,
	}));
}
