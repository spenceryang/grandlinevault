import { config, requireEnv } from "../config.js";
import type {
	RecognitionCandidate,
	RecognitionResult,
} from "../types.js";

type RawRecognitionCandidate = {
	cardId?: string;
	card_id?: string;
	card_identity?: string;
	id?: string;
	name?: string;
	card_name?: string;
	confidence?: number;
	card_identity_confidence?: number;
	language?: string;
	imageUrl?: string;
	image_url?: string;
	image?: string;
};

type OpenAiVisionCardResult = {
	isOnePieceCard?: boolean;
	isEnglish?: boolean;
	cardId?: string | null;
	name?: string | null;
	confidence?: number | null;
	reason?: string | null;
};

export async function recognizeCardFromImageUrl(
	imageUrl: string,
): Promise<RecognitionResult> {
	const imageResponse = await fetch(imageUrl);

	if (!imageResponse.ok) {
		throw new Error(`Unable to fetch scan image: ${imageResponse.status}.`);
	}

	return recognizeCardFromImageBlob(await imageResponse.blob(), "scan.jpg");
}

export async function recognizeCardFromImageBlob(
	imageBlob: Blob,
	filename = "scan.jpg",
): Promise<RecognitionResult> {
	return recognizeCardFromImageBlobWithOpenAi(imageBlob, filename);
}

async function recognizeCardFromImageBlobWithOpenAi(
	imageBlob: Blob,
	filename: string,
): Promise<RecognitionResult> {
	const apiKey = requireEnv(config.openaiApiKey, "OPENAI_API_KEY");
	const imageDataUrl = await blobToDataUrl(imageBlob, filename);
	const response = await fetch("https://api.openai.com/v1/responses", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: config.openaiVisionModel,
			store: false,
			max_output_tokens: 500,
			text: {
				format: {
					type: "json_schema",
					name: "one_piece_card_scan",
					strict: true,
					schema: {
						type: "object",
						additionalProperties: false,
						required: [
							"isOnePieceCard",
							"isEnglish",
							"cardId",
							"name",
							"confidence",
							"reason",
						],
						properties: {
							isOnePieceCard: { type: "boolean" },
							isEnglish: { type: "boolean" },
							cardId: {
								type: ["string", "null"],
								description:
									"Visible One Piece card number, e.g. OP13-003 or ST02-009.",
							},
							name: {
								type: ["string", "null"],
								description: "Visible English card name.",
							},
							confidence: {
								type: "number",
								description:
									"0 to 1 confidence that cardId and name were read correctly.",
							},
							reason: { type: ["string", "null"] },
						},
					},
				},
			},
			input: [
				{
					role: "user",
					content: [
						{
							type: "input_text",
							text: "Identify this English One Piece Card Game card. Read the visible card number and card name only. Reject Japanese/non-English cards. Return null fields if unreadable.",
						},
						{ type: "input_image", image_url: imageDataUrl, detail: "high" },
					],
				},
			],
		}),
	});

	if (!response.ok) {
		throw new Error(`OpenAI vision request failed with ${response.status}.`);
	}

	const payload = (await response.json()) as unknown;
	const parsed = parseOpenAiVisionCardResult(payload);
	return recognitionFromOpenAiVision(parsed);
}

export function normalizeRecognitionCandidate(
	candidate: RawRecognitionCandidate,
): RecognitionCandidate | null {
	const cardId = candidate.cardId ?? candidate.card_id ?? candidate.card_identity ?? candidate.id;
	const name = candidate.name ?? candidate.card_name;
	if (!cardId || !name) {
		return null;
	}

	const language = normalizeLanguage(candidate.language);

	return {
		cardId,
		name,
		confidence: normalizeConfidence(
			candidate.confidence ?? candidate.card_identity_confidence ?? 0,
		),
		language,
		imageUrl: candidate.imageUrl ?? candidate.image_url ?? candidate.image,
	};
}

function normalizeConfidence(confidence: number): number {
	return confidence > 1 ? confidence / 100 : confidence;
}

export function classifyRecognition(
	candidates: RecognitionCandidate[],
): RecognitionResult {
	if (candidates.length === 0) {
		return {
			status: "needs_review",
			reason: "No recognition candidates were returned.",
			candidates,
		};
	}

	const [best] = candidates;
	if (best.language !== "English" && best.language !== "Unknown") {
		return {
			status: "rejected",
			reason: "Only English cards are supported in the MVP.",
			candidates,
		};
	}

	if (best.confidence < config.recognitionConfidenceThreshold) {
		return {
			status: "needs_review",
			reason: "Recognition confidence is below the auto-match threshold.",
			candidates,
		};
	}

	return { status: "matched", candidate: best };
}

export function parseOpenAiVisionCardResult(
	payload: unknown,
): OpenAiVisionCardResult {
	if (!payload || typeof payload !== "object") return {};
	const outputText = extractOpenAiOutputText(payload as Record<string, unknown>);
	if (!outputText) return {};
	try {
		return JSON.parse(outputText) as OpenAiVisionCardResult;
	} catch {
		return {};
	}
}

function extractOpenAiOutputText(payload: Record<string, unknown>): string | null {
	if (typeof payload.output_text === "string") return payload.output_text;
	const output = Array.isArray(payload.output) ? payload.output : [];
	for (const item of output) {
		if (!item || typeof item !== "object") continue;
		const content = Array.isArray((item as { content?: unknown }).content)
			? (item as { content?: unknown[] }).content ?? []
			: [];
		for (const contentItem of content) {
			if (!contentItem || typeof contentItem !== "object") continue;
			const text = (contentItem as { text?: unknown }).text;
			if (typeof text === "string") return text;
		}
	}
	return null;
}

function recognitionFromOpenAiVision(
	result: OpenAiVisionCardResult,
): RecognitionResult {
	if (!result.isOnePieceCard) {
		return {
			status: "needs_review",
			reason: result.reason ?? "OpenAI vision did not identify a One Piece card.",
			candidates: [],
		};
	}

	if (!result.isEnglish) {
		return {
			status: "rejected",
			reason: "Only English cards are supported in the MVP.",
			candidates: [],
		};
	}

	const cardId = result.cardId?.trim();
	const name = result.name?.trim();
	if (!cardId || !name) {
		return {
			status: "needs_review",
			reason: result.reason ?? "OpenAI vision could not read both card ID and name.",
			candidates: [],
		};
	}

	return classifyRecognition([
		{
			cardId,
			name,
			confidence: clampConfidence(result.confidence ?? 0.9),
			language: "English",
		},
	]);
}

function clampConfidence(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

async function blobToDataUrl(blob: Blob, filename: string): Promise<string> {
	const contentType = blob.type || contentTypeFromFilename(filename);
	const bytes = Buffer.from(await blob.arrayBuffer());
	return `data:${contentType};base64,${bytes.toString("base64")}`;
}

function contentTypeFromFilename(filename: string): string {
	const normalized = filename.toLowerCase();
	if (normalized.endsWith(".png")) return "image/png";
	if (normalized.endsWith(".webp")) return "image/webp";
	if (normalized.endsWith(".heic")) return "image/heic";
	return "image/jpeg";
}

function normalizeLanguage(
	language: string | undefined,
): RecognitionCandidate["language"] {
	const normalized = language?.trim().toLowerCase();
	if (normalized === "english" || normalized === "en") {
		return "English";
	}
	if (normalized === "japanese" || normalized === "jp") {
		return "Japanese";
	}
	if (normalized === "chinese" || normalized === "zh") {
		return "Chinese";
	}
	return "Unknown";
}
