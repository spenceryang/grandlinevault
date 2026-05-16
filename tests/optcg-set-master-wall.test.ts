import assert from "node:assert/strict";
import test from "node:test";
import {
	buildOptcgSetMasterWallEntries,
	type OptcgSetMasterWallSourceCard,
	summarizeOptcgSetMasterWall,
	toGreyscaleImageUrl,
} from "../src/lib/optcg-set-master-wall.js";

function card(
	overrides: Partial<OptcgSetMasterWallSourceCard> = {},
): OptcgSetMasterWallSourceCard {
	return {
		cardSetId: "OP01-003",
		cardImageId: "OP01-003",
		name: "Monkey.D.Luffy (003)",
		setId: "OP-01",
		setName: "Romance Dawn",
		rarity: "L",
		color: "Red",
		cardType: "Leader",
		imageUrl: "https://optcgapi.com/media/static/Card_Images/OP01-003.jpg",
		...overrides,
	};
}

test("toGreyscaleImageUrl wraps URL in wsrv.nl greyscale proxy", () => {
	const url = toGreyscaleImageUrl(
		"https://optcgapi.com/media/static/Card_Images/OP01-003.jpg",
	);
	assert.ok(url.startsWith("https://wsrv.nl/?url="));
	assert.match(url, /filt=greyscale/);
	assert.match(url, /optcgapi\.com/);
});

test("buildOptcgSetMasterWallEntries produces both color + greyscale URLs", () => {
	const entries = buildOptcgSetMasterWallEntries(
		"OP-01",
		[card()],
		new Set(["OP01-003"]),
	);
	assert.equal(entries.length, 1);
	assert.equal(entries[0].owned, true);
	assert.equal(
		entries[0].colorImageUrl,
		"https://optcgapi.com/media/static/Card_Images/OP01-003.jpg",
	);
	assert.ok(entries[0].greyscaleImageUrl.includes("wsrv.nl"));
});

test("buildOptcgSetMasterWallEntries matches by both cardImageId and cardSetId", () => {
	const cards = [
		card({ cardSetId: "OP01-003", cardImageId: "OP01-003" }),
		card({
			cardSetId: "OP01-003",
			cardImageId: "OP01-003_p1",
			name: "Luffy (003) (Parallel)",
		}),
	];
	// Owning only the base id should mark both the base AND the parallel as owned
	// (matches by cardSetId when cardImageId doesn't match)
	const entries = buildOptcgSetMasterWallEntries(
		"OP-01",
		cards,
		new Set(["OP01-003"]),
	);
	assert.equal(entries[0].owned, true);
	assert.equal(entries[1].owned, true);
});

test("buildOptcgSetMasterWallEntries matches by exact cardImageId", () => {
	const cards = [
		card({ cardImageId: "OP01-003" }),
		card({ cardImageId: "OP01-003_p1", name: "Parallel" }),
	];
	const entries = buildOptcgSetMasterWallEntries(
		"OP-01",
		cards,
		new Set(["OP01-003_p1"]),
	);
	// Owning the parallel marks both as owned (because cardSetId matches for the base, exact for parallel)
	assert.equal(entries[1].owned, true);
});

test("buildOptcgSetMasterWallEntries is case-insensitive on owned ids", () => {
	const entries = buildOptcgSetMasterWallEntries(
		"OP-01",
		[card()],
		new Set(["op01-003"]),
	);
	assert.equal(entries[0].owned, true);
});

test("buildOptcgSetMasterWallEntries sorts base before parallel for same cardSetId", () => {
	const cards = [
		card({ cardImageId: "OP01-003_p1", name: "Parallel" }),
		card({ cardImageId: "OP01-003" }),
	];
	const entries = buildOptcgSetMasterWallEntries(
		"OP-01",
		cards,
		new Set(),
	);
	assert.equal(entries[0].cardImageId, "OP01-003");
	assert.equal(entries[1].cardImageId, "OP01-003_p1");
});

test("summarizeOptcgSetMasterWall computes per-set completion", () => {
	const cards = [
		card({ cardImageId: "OP01-003" }),
		card({ cardImageId: "OP01-024", cardSetId: "OP01-024", name: "Zoro" }),
		card({ cardImageId: "OP01-077", cardSetId: "OP01-077", name: "Perona" }),
	];
	const entries = buildOptcgSetMasterWallEntries(
		"OP-01",
		cards,
		new Set(["OP01-003", "OP01-024"]),
	);
	const summary = summarizeOptcgSetMasterWall(entries);
	assert.equal(summary.totalCards, 3);
	assert.equal(summary.ownedCards, 2);
	assert.equal(summary.missingCount, 1);
	assert.ok(Math.abs(summary.completionFraction - 2 / 3) < 1e-9);
	assert.equal(summary.setName, "Romance Dawn");
});

test("summarizeOptcgSetMasterWall handles empty input", () => {
	const summary = summarizeOptcgSetMasterWall([]);
	assert.equal(summary.totalCards, 0);
	assert.equal(summary.completionFraction, 0);
	assert.equal(summary.setId, "UNKNOWN");
});

test("buildOptcgSetMasterWallEntries preserves setName/setId from card data", () => {
	const entries = buildOptcgSetMasterWallEntries(
		"FALLBACK",
		[card({ setId: "OP-02", setName: "Paramount War" })],
		new Set(),
	);
	assert.equal(entries[0].setId, "OP-02");
	assert.equal(entries[0].setName, "Paramount War");
});

test("buildOptcgSetMasterWallEntries falls back to provided setId when card lacks it", () => {
	const entries = buildOptcgSetMasterWallEntries(
		"OP-01",
		[card({ setId: null, setName: null })],
		new Set(),
	);
	assert.equal(entries[0].setId, "OP-01");
	assert.equal(entries[0].setName, "OP-01");
});
