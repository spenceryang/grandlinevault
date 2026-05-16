import assert from "node:assert/strict";
import test from "node:test";
import {
	buildIgShareStorySvg,
	type IgStoryCardListing,
} from "../src/lib/ig-share-story-svg.js";

function listing(
	overrides: Partial<IgStoryCardListing> = {},
): IgStoryCardListing {
	return {
		name: "Charizard 4/102",
		cardId: "base1-4",
		imageUrl: "https://assets.tcgdex.net/en/base/base1/4/high.jpg",
		askingPrice: 250,
		condition: "PSA 8",
		...overrides,
	};
}

test("buildIgShareStorySvg produces a 1080x1920 SVG by default", () => {
	const svg = buildIgShareStorySvg({
		headline: "Selling these",
		listings: [listing()],
	});
	assert.ok(svg.includes('width="1080"'));
	assert.ok(svg.includes('height="1920"'));
	assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
});

test("buildIgShareStorySvg embeds the headline + listing count subhead", () => {
	const svg = buildIgShareStorySvg({
		headline: "Trade Night",
		listings: [listing(), listing({ cardId: "x" })],
	});
	assert.ok(svg.includes("Trade Night"));
	assert.ok(svg.includes("2 cards available"));
});

test("buildIgShareStorySvg renders asking prices and DM fallback", () => {
	const svg = buildIgShareStorySvg({
		headline: "Sale",
		listings: [
			listing({ askingPrice: 99.5 }),
			listing({ cardId: "y", askingPrice: null }),
		],
	});
	assert.ok(svg.includes("$99.50"));
	assert.ok(svg.includes("DM for price"));
});

test("buildIgShareStorySvg embeds seller name when provided", () => {
	const svg = buildIgShareStorySvg({
		headline: "Cards",
		sellerName: "Spencer",
		listings: [listing()],
	});
	assert.ok(svg.includes("Seller: Spencer"));
});

test("buildIgShareStorySvg respects maxListings", () => {
	const listings = Array.from({ length: 12 }, (_, i) =>
		listing({ cardId: `c-${i}`, name: `Card ${i}` }),
	);
	const svg = buildIgShareStorySvg(
		{ headline: "Drop", listings },
		{ maxListings: 4 },
	);
	assert.ok(svg.includes("Card 0"));
	assert.ok(svg.includes("Card 3"));
	assert.ok(!svg.includes("Card 4"));
});

test("buildIgShareStorySvg truncates long card names", () => {
	const svg = buildIgShareStorySvg({
		headline: "Sale",
		listings: [
			listing({ name: "This is a really really really long card name that overflows" }),
		],
	});
	assert.ok(svg.includes("…"));
});

test("buildIgShareStorySvg escapes user-controlled text against injection", () => {
	const svg = buildIgShareStorySvg({
		headline: "<script>alert(1)</script>",
		sellerName: "<img src=x>",
		listings: [listing({ name: "<b>boom</b>" })],
	});
	assert.ok(!svg.includes("<script>alert(1)</script>"));
	assert.ok(!svg.includes("<img src=x>"));
	assert.ok(svg.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
});

test("buildIgShareStorySvg renders the public Notion URL when supplied", () => {
	const svg = buildIgShareStorySvg({
		headline: "x",
		listings: [listing()],
		notionPublicUrl: "https://www.notion.so/Vault-abc",
	});
	assert.ok(svg.includes("https://www.notion.so/Vault-abc"));
});

test("buildIgShareStorySvg includes default CTA when none provided", () => {
	const svg = buildIgShareStorySvg({
		headline: "x",
		listings: [listing()],
	});
	assert.ok(svg.includes("DM to buy"));
});

test("buildIgShareStorySvg renders secondary CTA when provided", () => {
	const svg = buildIgShareStorySvg({
		headline: "x",
		listings: [listing()],
		ctaPrimary: "Venmo @spencer",
		ctaSecondary: "Bundle discounts available",
	});
	assert.ok(svg.includes("Venmo @spencer"));
	assert.ok(svg.includes("Bundle discounts available"));
});

test("buildIgShareStorySvg supports custom dimensions + colors", () => {
	const svg = buildIgShareStorySvg(
		{ headline: "x", listings: [listing()] },
		{ width: 720, height: 1280, background: "#ffffff", accent: "#ff00aa" },
	);
	assert.ok(svg.includes('width="720"'));
	assert.ok(svg.includes('height="1280"'));
	assert.ok(svg.includes("#ffffff"));
	assert.ok(svg.includes("#ff00aa"));
});
