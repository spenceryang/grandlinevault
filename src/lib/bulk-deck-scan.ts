import type { DecklistEntry, DecklistSlot } from "./decklist.js";

export type RecognizedScan = {
	cardSetId: string;
	cardImageId?: string;
	confidence: number;
	boundingBox?: { x: number; y: number; width: number; height: number };
};

export type DecklistCardMetadata = {
	name: string;
	cardType: string | null;
	color?: string | null;
	cost?: number | null;
	power?: number | null;
	marketPrice?: number | null;
};

export type BulkScanOptions = {
	confidenceThreshold?: number;
	maxCopiesPerCard?: number;
	defaultSlot?: DecklistSlot;
};

export type BulkScanResult = {
	entries: DecklistEntry[];
	skippedLowConfidence: number;
	unknownCards: string[];
	totalRecognized: number;
};

const DEFAULT_CONFIDENCE_THRESHOLD = 0.82;
const DEFAULT_MAX_COPIES = 4;

export function classifyDecklistSlot(
	cardType: string | null | undefined,
): DecklistSlot {
	if (!cardType) return "Character";
	const normalized = cardType.trim().toLowerCase();
	if (normalized.startsWith("leader")) return "Leader";
	if (normalized.startsWith("character")) return "Character";
	if (normalized.startsWith("event")) return "Event";
	if (normalized.startsWith("stage")) return "Stage";
	if (normalized.includes("don")) return "DON";
	return "Character";
}

export function buildDecklistFromBulkScan(
	scans: ReadonlyArray<RecognizedScan>,
	enrichment: ReadonlyMap<string, DecklistCardMetadata>,
	options: BulkScanOptions = {},
): BulkScanResult {
	const threshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
	const maxCopies = Math.max(1, options.maxCopiesPerCard ?? DEFAULT_MAX_COPIES);

	let skippedLowConfidence = 0;
	const unknownCards: string[] = [];
	const buckets = new Map<
		string,
		{
			cardSetId: string;
			cardImageId?: string;
			meta: DecklistCardMetadata | null;
			count: number;
		}
	>();

	for (const scan of scans) {
		if (scan.confidence < threshold) {
			skippedLowConfidence += 1;
			continue;
		}
		const key = scan.cardSetId.trim().toUpperCase();
		if (!key) continue;
		const meta = enrichment.get(key) ?? enrichment.get(scan.cardSetId);
		if (!meta) {
			unknownCards.push(scan.cardSetId);
		}
		const existing = buckets.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			buckets.set(key, {
				cardSetId: scan.cardSetId,
				cardImageId: scan.cardImageId,
				meta: meta ?? null,
				count: 1,
			});
		}
	}

	const entries: DecklistEntry[] = [];
	for (const bucket of buckets.values()) {
		const slot = classifyDecklistSlot(bucket.meta?.cardType ?? null);
		const quantity =
			slot === "Leader" ? 1 : Math.min(bucket.count, maxCopies);
		entries.push({
			cardSetId: bucket.cardSetId,
			cardImageId: bucket.cardImageId,
			name: bucket.meta?.name ?? bucket.cardSetId,
			slot: options.defaultSlot ?? slot,
			quantity,
			color: bucket.meta?.color ?? undefined,
			cost: bucket.meta?.cost ?? null,
			marketPrice: bucket.meta?.marketPrice ?? null,
		});
	}

	return {
		entries,
		skippedLowConfidence,
		unknownCards,
		totalRecognized: scans.length,
	};
}

export function aggregateRecognizedScans(
	scans: ReadonlyArray<RecognizedScan>,
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const scan of scans) {
		const key = scan.cardSetId.trim().toUpperCase();
		if (!key) continue;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}
