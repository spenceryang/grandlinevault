import type { Client } from "@notionhq/client";
import { config, requireEnv } from "../config.js";
import { resolveOptcgCardDetails } from "../providers/optcgapi/resolve-card.js";
import { recognizeCardFromImageUrl } from "../providers/recognition.js";
import { createOwnedCardPage } from "./write-owned-card.js";

type PageData = {
	id: string;
	properties: Record<string, unknown>;
	url?: string;
};

type FileEntry = {
	type?: "external" | "file";
	external?: { url?: string };
	file?: { url?: string };
};

type RichTextEntry = {
	plain_text?: string;
	text?: { content?: string };
};

type ScanInboxStatus = "Processing" | "Matched" | "Needs Review" | "Rejected";

export type ProcessScanInboxResult = {
	status: ScanInboxStatus;
	message: string;
	ownedCardPageId?: string;
	ownedCardUrl?: string;
};

export type LatestScanSummary = {
	found: boolean;
	pageId?: string;
	pageUrl?: string;
	status?: string;
	result?: string;
	confidence?: number | null;
	ownedCardUrl?: string | null;
};

export async function processScanInboxQueue(
	notion: Client,
	limit = 10,
): Promise<{ processed: ProcessScanInboxResult[] }> {
	const dataSourceId = requireEnv(
		config.scanInboxDataSourceId,
		"SCAN_INBOX_DATA_SOURCE_ID",
	);
	const response = await notion.dataSources.query({
		data_source_id: dataSourceId,
		page_size: limit,
		filter: {
			property: "Status",
			select: { equals: "New" },
		},
		sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
	});

	const pages = response.results.filter(
		(page) => "properties" in page,
	) as PageData[];
	const processed: ProcessScanInboxResult[] = [];
	for (const page of pages) {
		processed.push(await processScanInboxPage(notion, page));
	}

	return { processed };
}

export async function processLatestScan(
	notion: Client,
): Promise<ProcessScanInboxResult> {
	const result = await processScanInboxQueue(notion, 1);
	const [processed] = result.processed;
	if (!processed) {
		return {
			status: "Needs Review",
			message: "No Scan Inbox rows with Status = New were found.",
		};
	}
	return processed;
}

export async function whatDidIJustScan(
	notion: Client,
): Promise<LatestScanSummary> {
	const dataSourceId = requireEnv(
		config.scanInboxDataSourceId,
		"SCAN_INBOX_DATA_SOURCE_ID",
	);
	const response = await notion.dataSources.query({
		data_source_id: dataSourceId,
		page_size: 1,
		filter: {
			property: "Status",
			select: { equals: "Matched" },
		},
		sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
	});
	const page = response.results.find((result) => "properties" in result) as
		| PageData
		| undefined;
	if (!page) return { found: false };

	return {
		found: true,
		pageId: page.id,
		pageUrl: page.url,
		status: extractSelectName(page.properties.Status) ?? undefined,
		result: extractRichText(page.properties["Recognition result"]) ?? undefined,
		confidence: extractNumber(page.properties.Confidence),
		ownedCardUrl: extractUrl(page.properties["Linked owned card"]),
	};
}

export async function processScanInboxPage(
	notion: Client,
	pageData: PageData,
): Promise<ProcessScanInboxResult> {
	const frontImageUrl = extractFirstFileUrl(pageData.properties, [
		"Front image",
		"Image",
		"Scan image",
	]);
	const ownerName =
		extractRichText(pageData.properties.Owner) ||
		extractTitle(pageData.properties.Name) ||
		"Spencer";

	if (!frontImageUrl) {
		const result = {
			status: "Needs Review" as const,
			message: "No Front image file was found on this Scan Inbox row.",
		};
		await updateScanInboxResult(notion, pageData.id, result);
		return result;
	}

	await updateScanInboxResult(notion, pageData.id, {
		status: "Processing",
		message: "Recognizing uploaded card image…",
	});

	try {
		const recognition = await recognizeCardFromImageUrl(frontImageUrl);
		const bestCandidate =
			recognition.status === "matched"
				? recognition.candidate
				: recognition.candidates[0];

		if (recognition.status !== "matched") {
			const result = {
				status: recognition.status === "rejected"
					? ("Rejected" as const)
					: ("Needs Review" as const),
				message: `${recognition.reason}${bestCandidate ? ` Best guess: ${bestCandidate.name} (${bestCandidate.cardId}).` : ""}`,
				confidence: bestCandidate?.confidence,
			};
			await updateScanInboxResult(notion, pageData.id, result);
			return result;
		}

		const variants = await resolveOptcgCardDetails(recognition.candidate.cardId);
		const variant =
			variants.find((candidate) => candidate.cardImageId === candidate.cardSetId) ??
			variants[0];

		if (!variant) {
			const result = {
				status: "Needs Review" as const,
				message: `Recognized ${recognition.candidate.name} (${recognition.candidate.cardId}), but no OPTCG card details were found.`,
				confidence: recognition.candidate.confidence,
			};
			await updateScanInboxResult(notion, pageData.id, result);
			return result;
		}

		const ownedCard = await createOwnedCardPage(notion, {
			ownerName,
			cardId: variant.cardSetId,
			cardName: variant.name,
			quantity: 1,
			condition: null,
			preGradeEstimate: null,
			imageUrl: variant.imageUrl || frontImageUrl,
			setCode: variant.setId,
			setName: variant.setName,
			rarity: variant.rarity,
			color: variant.color,
			cardType: variant.cardType,
			marketPrice: variant.marketPrice,
		});

		const result = {
			status: "Matched" as const,
			message: `Matched ${variant.name} (${variant.cardSetId}) · ${variant.setId ?? "Unknown set"} · ${variant.rarity ?? "Unknown rarity"}${typeof variant.marketPrice === "number" ? ` · $${variant.marketPrice.toFixed(2)}` : ""}`,
			confidence: recognition.candidate.confidence,
			ownedCardPageId: ownedCard.pageId,
			ownedCardUrl: ownedCard.url,
		};
		await updateScanInboxResult(notion, pageData.id, result);
		return result;
	} catch (error) {
		const result = {
			status: "Needs Review" as const,
			message: `Scan processing failed: ${error instanceof Error ? error.message : String(error)}`,
		};
		await updateScanInboxResult(notion, pageData.id, result);
		return result;
	}
}

export function extractFirstFileUrl(
	properties: Record<string, unknown>,
	propertyNames: string[],
): string | null {
	for (const propertyName of propertyNames) {
		const property = properties[propertyName] as { files?: FileEntry[] } | undefined;
		const file = property?.files?.[0];
		const url = file?.external?.url ?? file?.file?.url;
		if (url) return url;
	}
	return null;
}

export function extractRichText(property: unknown): string | null {
	const richText = (property as { rich_text?: RichTextEntry[] } | undefined)
		?.rich_text;
	return joinText(richText);
}

function extractSelectName(property: unknown): string | null {
	return (
		(property as { select?: { name?: string | null } } | undefined)?.select
			?.name ?? null
	);
}

function extractNumber(property: unknown): number | null {
	const value = (property as { number?: number | null } | undefined)?.number;
	return typeof value === "number" ? value : null;
}

function extractUrl(property: unknown): string | null {
	return (property as { url?: string | null } | undefined)?.url ?? null;
}

function extractTitle(property: unknown): string | null {
	const title = (property as { title?: RichTextEntry[] } | undefined)?.title;
	return joinText(title);
}

function joinText(entries: RichTextEntry[] | undefined): string | null {
	const text = entries
		?.map((entry) => entry.plain_text ?? entry.text?.content ?? "")
		.join("")
		.trim();
	return text || null;
}

async function updateScanInboxResult(
	notion: Client,
	pageId: string,
	result: {
		status: ScanInboxStatus;
		message: string;
		confidence?: number;
		ownedCardUrl?: string;
	},
): Promise<void> {
	await notion.pages.update({
		page_id: pageId,
		properties: {
			Status: { select: { name: result.status } },
			"Recognition result": richTextProperty(result.message),
			Confidence: { number: result.confidence ?? null },
			"Linked owned card": { url: result.ownedCardUrl ?? null },
		},
	});
}

function richTextProperty(content: string) {
	return {
		rich_text: [
			{
				text: {
					content: content.slice(0, 2000),
				},
			},
		],
	};
}
