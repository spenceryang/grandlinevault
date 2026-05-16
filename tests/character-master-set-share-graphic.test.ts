import assert from "node:assert/strict";
import test from "node:test";
import {
	buildCharacterMasterSetSvg,
	CHARACTER_ACCENTS,
	pickHighlightCards,
} from "../src/lib/character-master-set-share-graphic.js";
import type { PokemonMasterSetEntry } from "../src/lib/pokemon-character-master-set.js";

function entry(
	overrides: Partial<PokemonMasterSetEntry> = {},
): PokemonMasterSetEntry {
	return {
		character: "Charizard",
		cardId: "swsh1-25",
		localId: "25",
		name: "Charizard",
		colorImageUrl: "https://assets.tcgdex.net/en/swsh/swsh1/25/high.jpg",
		greyscaleImageUrl: "https://wsrv.nl/?url=...",
		owned: true,
		...overrides,
	};
}

test("buildCharacterMasterSetSvg renders the character title in uppercase", () => {
	const svg = buildCharacterMasterSetSvg({
		character: "Charizard",
		totalCards: 125,
		ownedCards: 42,
		notionPublicUrl: "https://www.notion.so/Vault-abc",
	});
	assert.ok(svg.includes("CHARIZARD MASTER SET"));
});

test("buildCharacterMasterSetSvg embeds owned/total ratio", () => {
	const svg = buildCharacterMasterSetSvg({
		character: "Pikachu",
		totalCards: 204,
		ownedCards: 17,
		notionPublicUrl: "https://www.notion.so/Vault-abc",
	});
	assert.ok(svg.includes("17 of 204"));
	assert.ok(svg.includes("8% complete"));
});

test("buildCharacterMasterSetSvg embeds the public Notion URL", () => {
	const svg = buildCharacterMasterSetSvg({
		character: "Charizard",
		totalCards: 100,
		ownedCards: 50,
		notionPublicUrl: "https://www.notion.so/MyVault-xyz",
	});
	assert.ok(svg.includes("https://www.notion.so/MyVault-xyz"));
});

test("buildCharacterMasterSetSvg includes only owned highlight images", () => {
	const highlights = [
		entry({ cardId: "owned-1", owned: true }),
		entry({ cardId: "owned-2", owned: true }),
		entry({ cardId: "not-owned", owned: false }),
		entry({ cardId: "no-image", colorImageUrl: null }),
	];
	const svg = buildCharacterMasterSetSvg({
		character: "Charizard",
		totalCards: 4,
		ownedCards: 2,
		notionPublicUrl: "url",
		highlightCards: highlights,
	});
	assert.ok(svg.includes("owned-1") || svg.includes("/high.jpg"));
	assert.ok(!svg.includes("not-owned"));
});

test("buildCharacterMasterSetSvg uses per-character accent colors", () => {
	const charizardSvg = buildCharacterMasterSetSvg({
		character: "Charizard",
		totalCards: 100,
		ownedCards: 10,
		notionPublicUrl: "u",
	});
	const pikachuSvg = buildCharacterMasterSetSvg({
		character: "Pikachu",
		totalCards: 100,
		ownedCards: 10,
		notionPublicUrl: "u",
	});
	assert.ok(charizardSvg.includes(CHARACTER_ACCENTS.Charizard));
	assert.ok(pikachuSvg.includes(CHARACTER_ACCENTS.Pikachu));
});

test("buildCharacterMasterSetSvg shows collector name when provided", () => {
	const svg = buildCharacterMasterSetSvg({
		character: "Charizard",
		totalCards: 100,
		ownedCards: 50,
		notionPublicUrl: "u",
		collectorName: "Spencer",
	});
	assert.ok(svg.includes("Spencer's 50 of 100"));
});

test("buildCharacterMasterSetSvg handles 0 / 0 without dividing by zero", () => {
	const svg = buildCharacterMasterSetSvg({
		character: "Charizard",
		totalCards: 0,
		ownedCards: 0,
		notionPublicUrl: "u",
	});
	assert.ok(svg.includes("0 of 0"));
	assert.ok(svg.includes("0% complete"));
});

test("buildCharacterMasterSetSvg starts with a valid SVG root", () => {
	const svg = buildCharacterMasterSetSvg({
		character: "Charizard",
		totalCards: 10,
		ownedCards: 5,
		notionPublicUrl: "u",
	});
	assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
	assert.ok(svg.endsWith("</svg>"));
});

test("pickHighlightCards distributes picks across the owned list", () => {
	const owned = Array.from({ length: 50 }, (_, i) =>
		entry({ cardId: `c-${i}` }),
	);
	const picks = pickHighlightCards(owned, 5);
	assert.equal(picks.length, 5);
	const ids = picks.map((p) => p.cardId);
	const unique = new Set(ids);
	assert.equal(unique.size, 5);
});

test("pickHighlightCards returns all when count exceeds available owned", () => {
	const owned = [entry({ cardId: "a" }), entry({ cardId: "b" })];
	const picks = pickHighlightCards(owned, 10);
	assert.equal(picks.length, 2);
});

test("pickHighlightCards excludes unowned and image-less cards", () => {
	const mix = [
		entry({ cardId: "a", owned: true }),
		entry({ cardId: "b", owned: false }),
		entry({ cardId: "c", colorImageUrl: null }),
	];
	const picks = pickHighlightCards(mix, 5);
	assert.equal(picks.length, 1);
	assert.equal(picks[0].cardId, "a");
});
