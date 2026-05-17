import assert from "node:assert/strict";
import test from "node:test";
import {
	classifyRecognition,
	normalizeRecognitionCandidate,
} from "../src/providers/recognition.js";

test("matches confident English cards", () => {
	const result = classifyRecognition([
		{
			cardId: "OP05-119",
			name: "Monkey.D.Luffy",
			confidence: 0.96,
			language: "English",
		},
	]);

	assert.equal(result.status, "matched");
});

test("matches confident unknown-language cards from providers without language metadata", () => {
	const result = classifyRecognition([
		{
			cardId: "OP05-119",
			name: "Monkey.D.Luffy",
			confidence: 0.96,
			language: "Unknown",
		},
	]);

	assert.equal(result.status, "matched");
});

test("rejects non-English cards", () => {
	const result = classifyRecognition([
		{
			cardId: "OP05-119",
			name: "Monkey.D.Luffy",
			confidence: 0.99,
			language: "Japanese",
		},
	]);

	assert.equal(result.status, "rejected");
});

test("normalizes GIBL identity/card-details fields", () => {
	assert.deepEqual(
		normalizeRecognitionCandidate({
			card_identity: "OP05-119",
			card_name: "Monkey.D.Luffy",
			card_identity_confidence: 0.91,
			image_url: "https://example.com/card.jpg",
		}),
		{
			cardId: "OP05-119",
			name: "Monkey.D.Luffy",
			confidence: 0.91,
			language: "Unknown",
			imageUrl: "https://example.com/card.jpg",
		},
	);
});
