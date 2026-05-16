import assert from "node:assert/strict";
import test from "node:test";
import { classifyRecognition } from "../src/providers/recognition.js";

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
