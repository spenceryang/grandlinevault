import assert from "node:assert/strict";
import test from "node:test";
import {
	extractFirstFileUrl,
	extractRichText,
} from "../src/notion/process-scan-inbox.js";

test("extractFirstFileUrl reads Notion uploaded files", () => {
	assert.equal(
		extractFirstFileUrl(
			{
				"Front image": {
					files: [
						{
							type: "file",
							file: { url: "https://secure.notion-static.com/scan.jpg" },
						},
					],
				},
			},
			["Front image"],
		),
		"https://secure.notion-static.com/scan.jpg",
	);
});

test("extractFirstFileUrl falls back across image property names", () => {
	assert.equal(
		extractFirstFileUrl(
			{
				Image: {
					files: [
						{
							type: "external",
							external: { url: "https://example.com/card.png" },
						},
					],
				},
			},
			["Front image", "Image"],
		),
		"https://example.com/card.png",
	);
});

test("extractRichText joins Notion rich text content", () => {
	assert.equal(
		extractRichText({
			rich_text: [
				{ plain_text: "Monkey" },
				{ text: { content: ".D.Luffy" } },
			],
		}),
		"Monkey.D.Luffy",
	);
});
