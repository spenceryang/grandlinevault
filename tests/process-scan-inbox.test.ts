import assert from "node:assert/strict";
import test from "node:test";
import {
	extractCardIdFromText,
	extractFirstBlockImageUrl,
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

test("extractFirstBlockImageUrl reads page-body image blocks", () => {
	assert.equal(
		extractFirstBlockImageUrl([
			{
				type: "paragraph",
			},
			{
				type: "image",
				image: {
					type: "file",
					file: { url: "https://secure.notion-static.com/body-scan.png" },
				},
			},
		]),
		"https://secure.notion-static.com/body-scan.png",
	);
});

test("extractCardIdFromText normalizes explicit OPTCG ids", () => {
	assert.equal(extractCardIdFromText("scan OP13-003 front"), "OP13-003");
	assert.equal(extractCardIdFromText("Set OP-05-001"), "OP05-001");
	assert.equal(extractCardIdFromText("starter st02-009"), "ST02-009");
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
