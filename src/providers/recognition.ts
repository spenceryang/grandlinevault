import { config, requireEnv } from "../config.js";
import type {
	RecognitionCandidate,
	RecognitionResult,
} from "../types.js";

type RawRecognitionCandidate = {
	cardId?: string;
	id?: string;
	name?: string;
	confidence?: number;
	language?: string;
	imageUrl?: string;
	image?: string;
};

export async function recognizeCardFromImageUrl(
	imageUrl: string,
): Promise<RecognitionResult> {
	const apiKey = requireEnv(config.giblApiKey, "GIBL_API_KEY");
	const imageResponse = await fetch(imageUrl);

	if (!imageResponse.ok) {
		throw new Error(`Unable to fetch scan image: ${imageResponse.status}.`);
	}

	const body = new FormData();
	body.append("file", await imageResponse.blob(), "scan.jpg");

	const response = await fetch(
		`https://gibltcg.com/api/v1/predict-card?key=${encodeURIComponent(apiKey)}`,
		{
			method: "POST",
			body,
		},
	);

	if (!response.ok) {
		throw new Error(`Recognition request failed with ${response.status}.`);
	}

	const payload = (await response.json()) as {
		data?: RawRecognitionCandidate[] | RawRecognitionCandidate;
		candidates?: RawRecognitionCandidate[];
	};

	const rawCandidates = Array.isArray(payload.data)
		? payload.data
		: payload.data
			? [payload.data]
			: payload.candidates ?? [];

	const candidates = rawCandidates
		.map(normalizeRecognitionCandidate)
		.filter((candidate): candidate is RecognitionCandidate => Boolean(candidate))
		.sort((a, b) => b.confidence - a.confidence);

	return classifyRecognition(candidates);
}

export function normalizeRecognitionCandidate(
	candidate: RawRecognitionCandidate,
): RecognitionCandidate | null {
	const cardId = candidate.cardId ?? candidate.id;
	if (!cardId || !candidate.name) {
		return null;
	}

	const language = normalizeLanguage(candidate.language);

	return {
		cardId,
		name: candidate.name,
		confidence: candidate.confidence ?? 0,
		language,
		imageUrl: candidate.imageUrl ?? candidate.image,
	};
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
	if (best.language !== "English") {
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
