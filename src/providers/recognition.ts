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

type GiblCardDetails = RawRecognitionCandidate & {
	data?: RawRecognitionCandidate;
	card?: RawRecognitionCandidate;
};

type GiblVisionItem = {
	card?: {
		type?: { label?: string; confidence?: number };
		identity?: {
			best?: {
				label?: string | number;
				confidence?: number;
				match?: {
					id?: string | number;
					cardId?: string;
					card_id?: string;
					name?: string;
					card_name?: string;
					number?: string;
					printedTotal?: string;
					image_url?: string;
					imageUrl?: string;
				};
			};
		};
	};
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
	const apiKey = requireEnv(config.giblApiKey, "GIBL_API_KEY");

	const body = new FormData();
	body.append("file", imageBlob, filename);

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
		identity?: RawRecognitionCandidate[];
		items?: GiblVisionItem[];
	};

	const rawCandidates = Array.isArray(payload.items)
		? payload.items.map(toCandidateFromGiblVisionItem).filter((candidate): candidate is RawRecognitionCandidate => Boolean(candidate))
		: Array.isArray(payload.identity)
		? await hydrateGiblIdentityCandidates(payload.identity, apiKey)
		: Array.isArray(payload.data)
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

function toCandidateFromGiblVisionItem(
	item: GiblVisionItem,
): RawRecognitionCandidate | null {
	const best = item.card?.identity?.best;
	const match = best?.match;
	const name = match?.name ?? match?.card_name;
	if (!best || !match || !name) return null;

	return {
		cardId: String(
			match.cardId ??
				match.card_id ??
				match.id ??
				match.number ??
				best.label ??
				"",
		),
		name,
		confidence: best.confidence,
		imageUrl: match.imageUrl ?? match.image_url,
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

async function hydrateGiblIdentityCandidates(
	identities: RawRecognitionCandidate[],
	apiKey: string,
): Promise<RawRecognitionCandidate[]> {
	return Promise.all(
		identities.map(async (identity) => {
			const cardIdentity = identity.card_identity ?? identity.cardId ?? identity.id;
			if (!cardIdentity) return identity;

			try {
				const response = await fetch(
					`https://gibltcg.com/api/v1/card-details/${encodeURIComponent(cardIdentity)}?key=${encodeURIComponent(apiKey)}`,
				);
				if (!response.ok) return identity;
				const detailsPayload = (await response.json()) as GiblCardDetails;
				const details = detailsPayload.data ?? detailsPayload.card ?? detailsPayload;
				return {
					...details,
					card_identity: cardIdentity,
					card_identity_confidence: identity.card_identity_confidence,
					confidence: identity.confidence ?? identity.card_identity_confidence,
				};
			} catch {
				return identity;
			}
		}),
	);
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
