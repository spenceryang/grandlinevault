import type { Client } from "@notionhq/client";
import { config, requireEnv } from "../config.js";
import type { BattleOwnedCard } from "../lib/op-battle.js";

export async function fetchBattleOwnedCards(
	notion: Client,
): Promise<BattleOwnedCard[]> {
	const dataSourceId = requireEnv(
		config.ownedCardsDataSourceId,
		"OWNED_CARDS_DATA_SOURCE_ID",
	);

	const rows: BattleOwnedCard[] = [];
	let startCursor: string | undefined;

	do {
		const response = await notion.dataSources.query({
			data_source_id: dataSourceId,
			start_cursor: startCursor,
			page_size: 100,
		});

		for (const page of response.results) {
			if (!("properties" in page)) continue;
			const properties = page.properties;
			const ownerName = getRichText(properties.Owner);
			const cardId = getRichText(properties["Card ID"]);
			const cardName = cleanOwnedTitle(getTitle(properties.Name), ownerName);
			const quantity = getNumber(properties.Quantity) ?? 0;
			if (!ownerName || !cardId || !cardName || quantity <= 0) continue;

			rows.push({
				ownerName,
				cardId,
				cardName,
				quantity,
				cardType: getRichText(properties["Card Type"]),
				color: getRichText(properties.Color),
				cost: getNumber(properties.Cost),
				power: getNumber(properties.Power),
				counter: getNumber(properties.Counter),
				rarity: getRichText(properties.Rarity),
				marketPrice: getNumber(properties["Market Price"]),
				setCode: getRichText(properties["Set Code"]),
				imageUrl: getFirstFileUrl(properties["Scan image"]),
			});
		}

		startCursor = response.next_cursor ?? undefined;
	} while (startCursor);

	return rows;
}

function cleanOwnedTitle(title: string | null, ownerName: string | null): string | null {
	if (!title) return null;
	if (!ownerName) return title;
	return title.replace(new RegExp(`\\s+·\\s+${escapeRegex(ownerName)}(?:\\s+·.*)?$`, "i"), "").trim();
}

function getTitle(property: unknown): string | null {
	if (!property || typeof property !== "object" || !("type" in property)) return null;
	if (property.type !== "title" || !("title" in property) || !Array.isArray(property.title)) {
		return null;
	}
	return property.title
		.map((item: { plain_text?: string }) => item.plain_text ?? "")
		.join("")
		.trim();
}

function getRichText(property: unknown): string | null {
	if (!property || typeof property !== "object" || !("type" in property)) return null;
	if (
		property.type !== "rich_text" ||
		!("rich_text" in property) ||
		!Array.isArray(property.rich_text)
	) {
		return null;
	}
	const value = property.rich_text
		.map((item: { plain_text?: string }) => item.plain_text ?? "")
		.join("")
		.trim();
	return value || null;
}

function getNumber(property: unknown): number | null {
	if (!property || typeof property !== "object" || !("type" in property)) return null;
	if (property.type !== "number" || !("number" in property)) return null;
	return typeof property.number === "number" ? property.number : null;
}

function getFirstFileUrl(property: unknown): string | null {
	if (!property || typeof property !== "object" || !("type" in property)) return null;
	if (property.type !== "files" || !("files" in property) || !Array.isArray(property.files)) {
		return null;
	}
	const first = property.files[0] as
		| { type?: "external"; external?: { url?: string } }
		| { type?: "file"; file?: { url?: string } }
		| undefined;
	if (!first) return null;
	if (first.type === "external") return first.external?.url ?? null;
	if (first.type === "file") return first.file?.url ?? null;
	return null;
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
