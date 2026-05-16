import assert from "node:assert/strict";
import test from "node:test";
import {
	buildTwitterShareGraphicSvg,
	formatHandle,
	type TwitterCardListing,
	wrapText,
} from "../src/lib/twitter-share-graphic.js";

function listing(
	overrides: Partial<TwitterCardListing> = {},
): TwitterCardListing {
	return {
		name: "Charizard",
		cardId: "base1-4",
		imageUrl: "https://assets.tcgdex.net/en/base/base1/4/high.jpg",
		marketPrice: 250,
		...overrides,
	};
}

test("buildTwitterShareGraphicSvg uses 1200x675 by default", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "New pulls",
		listings: [listing()],
	});
	assert.ok(svg.includes('width="1200"'));
	assert.ok(svg.includes('height="675"'));
});

test("buildTwitterShareGraphicSvg renders @handle with prefix", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "x",
		handle: "spencer",
		listings: [listing()],
	});
	assert.ok(svg.includes("@spencer"));
});

test("buildTwitterShareGraphicSvg preserves an explicit @handle", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "x",
		handle: "@jarrensj",
		listings: [listing()],
	});
	assert.ok(svg.includes("@jarrensj"));
});

test("buildTwitterShareGraphicSvg renders headline + subhead", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "Trade Night",
		subhead: "Selling 6 cards",
		listings: [listing()],
	});
	assert.ok(svg.includes("Trade Night"));
	assert.ok(svg.includes("Selling 6 cards"));
});

test("buildTwitterShareGraphicSvg embeds tweet text + wraps long content", () => {
	const tweet = "Just pulled the Charizard 4/102 of my dreams in PSA 9 graded condition!";
	const svg = buildTwitterShareGraphicSvg({
		headline: "Heat check",
		tweetText: tweet,
		listings: [listing()],
	});
	// Tweet text appears (first word at least)
	assert.ok(svg.includes("Just pulled"));
	assert.ok(svg.includes("Charizard"));
});

test("buildTwitterShareGraphicSvg renders hashtags with prefix", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "x",
		hashtags: ["PokemonTCG", "#Vault", "Charizard"],
		listings: [listing()],
	});
	assert.ok(svg.includes("#PokemonTCG"));
	assert.ok(svg.includes("#Vault"));
	assert.ok(svg.includes("#Charizard"));
});

test("buildTwitterShareGraphicSvg embeds price chip on each tile", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "x",
		listings: [listing({ marketPrice: 99 })],
	});
	assert.ok(svg.includes("$99"));
});

test("buildTwitterShareGraphicSvg omits price chip when null", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "x",
		listings: [listing({ marketPrice: null })],
	});
	assert.ok(!svg.includes("$NaN"));
});

test("buildTwitterShareGraphicSvg respects maxListings", () => {
	const many = Array.from({ length: 8 }, (_, i) =>
		listing({
			cardId: `c${i}`,
			name: `Card ${i}`,
			imageUrl: `https://example.com/${i}.jpg`,
		}),
	);
	const svg = buildTwitterShareGraphicSvg(
		{ headline: "x", listings: many },
		{ maxListings: 3 },
	);
	const imageTags = svg.match(/<image\s/g) ?? [];
	assert.equal(imageTags.length, 3);
	assert.ok(svg.includes("/0.jpg"));
	assert.ok(svg.includes("/2.jpg"));
	assert.ok(!svg.includes("/3.jpg"));
});

test("buildTwitterShareGraphicSvg escapes user-controlled text", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "<script>alert(1)</script>",
		tweetText: "<img src=x>",
		listings: [listing({ name: "<b>boom</b>" })],
	});
	assert.ok(!svg.includes("<script>alert(1)</script>"));
	assert.ok(svg.includes("&lt;script&gt;"));
});

test("buildTwitterShareGraphicSvg renders Notion URL + generated date in footer", () => {
	const svg = buildTwitterShareGraphicSvg({
		headline: "x",
		notionPublicUrl: "https://www.notion.so/Vault-abc",
		generatedAt: new Date("2026-05-16T00:00:00Z"),
		listings: [listing()],
	});
	assert.ok(svg.includes("https://www.notion.so/Vault-abc"));
	assert.ok(svg.includes("Grand Line Vault · 2026-05-16"));
});

test("formatHandle adds @ when missing, preserves when present", () => {
	assert.equal(formatHandle("spencer"), "@spencer");
	assert.equal(formatHandle("@spencer"), "@spencer");
	assert.equal(formatHandle("  jarrensj  "), "@jarrensj");
	assert.equal(formatHandle(""), "");
});

test("wrapText breaks at word boundaries respecting max width", () => {
	const lines = wrapText(
		"The quick brown fox jumps over the lazy dog",
		15,
	);
	for (const line of lines) {
		assert.ok(line.length <= 15, `${line} exceeded 15 chars`);
	}
	// Round-trip should preserve the sentence
	assert.equal(lines.join(" "), "The quick brown fox jumps over the lazy dog");
});

test("wrapText handles single overlong words by emitting them as their own line", () => {
	const lines = wrapText("Charizard supercharged super-rare", 10);
	assert.ok(lines.some((l) => l.includes("Charizard")));
});

test("wrapText returns empty array for empty input", () => {
	assert.deepEqual(wrapText("", 50), []);
	assert.deepEqual(wrapText("   ", 50), []);
});
