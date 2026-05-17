import assert from "node:assert/strict";
import test from "node:test";
import {
	classifyRecognition,
	normalizeRecognitionCandidate,
	parseOpenAiVisionCardResult,
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

test("parses OpenAI Responses output_text vision result", () => {
	assert.deepEqual(
		parseOpenAiVisionCardResult({
			output_text: JSON.stringify({
				isOnePieceCard: true,
				isEnglish: true,
				cardId: "OP13-003",
				name: "Gol.D.Roger",
				confidence: 0.94,
				reason: null,
			}),
		}),
		{
			isOnePieceCard: true,
			isEnglish: true,
			cardId: "OP13-003",
			name: "Gol.D.Roger",
			confidence: 0.94,
			reason: null,
		},
	);
});

test("parses OpenAI Responses nested output text", () => {
	assert.deepEqual(
		parseOpenAiVisionCardResult({
			output: [
				{
					content: [
						{
							type: "output_text",
							text: JSON.stringify({
								isOnePieceCard: true,
								isEnglish: true,
								cardId: "ST02-009",
								name: "Trafalgar Law",
								confidence: 0.88,
								reason: null,
							}),
						},
					],
				},
			],
		}),
		{
			isOnePieceCard: true,
			isEnglish: true,
			cardId: "ST02-009",
			name: "Trafalgar Law",
			confidence: 0.88,
			reason: null,
		},
	);
});
