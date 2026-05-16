import type { Client } from "@notionhq/client";
import { config, requireEnv } from "../config.js";
import type { OwnedCardRecord } from "../lib/collection.js";

export async function fetchOwnedCards(notion: Client): Promise<OwnedCardRecord[]> {
	const dataSourceId = requireEnv(
		config.ownedCardsDataSourceId,
		"OWNED_CARDS_DATA_SOURCE_ID",
	);

	const rows: OwnedCardRecord[] = [];
	let startCursor: string | undefined;

	do {
		const response = await notion.dataSources.query({
			data_source_id: dataSourceId,
			start_cursor: startCursor,
		});

		for (const page of response.results) {
			if (!("properties" in page)) {
				continue;
			}

			const properties = page.properties;
			const ownerName = getRichText(properties.Owner);
			const cardId = getRichText(properties["Card ID"]);
			const cardName = getTitle(properties.Name);
			const quantity = getNumber(properties.Quantity) ?? 0;

			if (!ownerName || !cardId || !cardName) {
				continue;
			}

			rows.push({ ownerName, cardId, cardName, quantity });
		}

		startCursor = response.next_cursor ?? undefined;
	} while (startCursor);

	return rows;
}

function getTitle(property: unknown): string | null {
	if (!property || typeof property !== "object" || !("type" in property)) {
		return null;
	}
	if (property.type !== "title" || !("title" in property)) {
		return null;
	}
	if (!Array.isArray(property.title)) {
		return null;
	}
	return property.title
		.map((item: { plain_text?: string }) => item.plain_text ?? "")
		.join("")
		.trim();
}

function getRichText(property: unknown): string | null {
	if (!property || typeof property !== "object" || !("type" in property)) {
		return null;
	}
	if (property.type !== "rich_text" || !("rich_text" in property)) {
		return null;
	}
	if (!Array.isArray(property.rich_text)) {
		return null;
	}
	return property.rich_text
		.map((item: { plain_text?: string }) => item.plain_text ?? "")
		.join("")
		.trim();
}

function getNumber(property: unknown): number | null {
	if (!property || typeof property !== "object" || !("type" in property)) {
		return null;
	}
	if (property.type !== "number" || !("number" in property)) {
		return null;
	}
	return typeof property.number === "number" ? property.number : null;
}
