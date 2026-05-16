import assert from "node:assert/strict";
import test from "node:test";
import {
	buildShareCollectionSvg,
	formatTotalsLine,
	type ShareCollectionGraphicInput,
	svgDataUrl,
} from "../src/lib/share-collection-graphic.js";

function input(
	overrides: Partial<ShareCollectionGraphicInput> = {},
): ShareCollectionGraphicInput {
	return {
		ownerName: "Spencer",
		collectionTitle: "Spencer's Vault",
		notionPublicUrl: "https://www.notion.so/Grand-Line-Vault-abc123",
		totalCards: 247,
		totalMarketValue: 12450,
		favoriteCards: [
			{
				name: "Monkey.D.Luffy (003)",
				cardSetId: "OP01-003",
				imageUrl: "https://optcgapi.com/img1.jpg",
				marketPrice: 355.88,
			},
			{
				name: "Roronoa Zoro (025)",
				cardSetId: "OP01-025",
				imageUrl: "https://optcgapi.com/img2.jpg",
				marketPrice: 220.0,
			},
		],
		generatedAt: new Date("2026-05-16T00:00:00Z"),
		...overrides,
	};
}

test("buildShareCollectionSvg embeds the public Notion URL", () => {
	const svg = buildShareCollectionSvg(input());
	assert.ok(svg.includes("https://www.notion.so/Grand-Line-Vault-abc123"));
});

test("buildShareCollectionSvg embeds owner name + collection title", () => {
	const svg = buildShareCollectionSvg(input());
	assert.ok(svg.includes("Spencer's Vault"));
	assert.ok(svg.includes("GRAND LINE VAULT"));
});

test("buildShareCollectionSvg includes favorite card images and names", () => {
	const svg = buildShareCollectionSvg(input());
	assert.ok(svg.includes("https://optcgapi.com/img1.jpg"));
	assert.ok(svg.includes("Monkey.D.Luffy (003)"));
	assert.ok(svg.includes("Roronoa Zoro (025)"));
	assert.ok(svg.includes("$355.88"));
});

test("buildShareCollectionSvg respects maxFavoriteCards", () => {
	const many = Array.from({ length: 8 }, (_, i) => ({
		name: `Card ${i}`,
		cardSetId: `X-${i}`,
		imageUrl: `https://optcgapi.com/${i}.jpg`,
	}));
	const svg = buildShareCollectionSvg(
		input({ favoriteCards: many }),
		{ maxFavoriteCards: 3 },
	);
	assert.ok(svg.includes("Card 0"));
	assert.ok(svg.includes("Card 2"));
	assert.ok(!svg.includes("Card 3"));
});

test("buildShareCollectionSvg escapes HTML metacharacters in owner names", () => {
	const svg = buildShareCollectionSvg(
		input({ collectionTitle: "Spencer's <script>Vault</script>" }),
	);
	assert.ok(!svg.includes("<script>Vault</script>"));
	assert.ok(svg.includes("&lt;script&gt;Vault&lt;/script&gt;"));
});

test("buildShareCollectionSvg renders without totals", () => {
	const svg = buildShareCollectionSvg(
		input({ totalCards: null, totalMarketValue: null }),
	);
	assert.ok(svg.includes("Spencer's Vault"));
	assert.ok(svg.includes("as of 2026-05-16"));
});

test("buildShareCollectionSvg uses custom colors", () => {
	const svg = buildShareCollectionSvg(input(), {
		background: "#ffffff",
		accent: "#ff00aa",
		textColor: "#000000",
	});
	assert.ok(svg.includes("#ffffff"));
	assert.ok(svg.includes("#ff00aa"));
});

test("formatTotalsLine combines card count, value, and date", () => {
	const line = formatTotalsLine(input());
	assert.ok(line.includes("247 cards"));
	assert.ok(line.includes("$12,450 portfolio"));
	assert.ok(line.includes("as of 2026-05-16"));
});

test("formatTotalsLine omits missing pieces gracefully", () => {
	const line = formatTotalsLine(input({ totalCards: null, totalMarketValue: null }));
	assert.equal(line, "as of 2026-05-16");
});

test("svgDataUrl produces a valid data URL", () => {
	const url = svgDataUrl("<svg></svg>");
	assert.match(url, /^data:image\/svg\+xml;charset=utf-8,/);
	assert.ok(url.includes("%3Csvg"));
});

test("buildShareCollectionSvg starts with an SVG root element", () => {
	const svg = buildShareCollectionSvg(input());
	assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
	assert.ok(svg.endsWith("</svg>"));
});
