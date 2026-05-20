import type { NotionFileLike, NotionPage, NotionProperty } from "./notion-http.js";

export type CollectionCardView = {
	id: string;
	pageUrl: string | null;
	name: string;
	owner: string;
	cardId: string;
	game: "One Piece" | "Pokemon" | "Unknown";
	set: string | null;
	rarity: string | null;
	color: string | null;
	type: string | null;
	quantity: number;
	marketPrice: number | null;
	imageUrl: string | null;
	tags: string[];
};

export type CollectionSummaryView = {
	totalUniqueCards: number;
	totalQuantity: number;
	totalMarketValue: number;
	owners: Array<{ label: string; quantity: number; value: number }>;
	games: Array<{ label: string; quantity: number; value: number }>;
};

export function normalizeCollectionPage(page: NotionPage): CollectionCardView | null {
	const properties = page.properties ?? {};
	const name = getText(properties.Name) || getText(properties.Title);
	const cardId = getText(properties["Card ID"]) || getText(properties["Card No."]);
	if (!name && !cardId) return null;

	const game = normalizeGame(getText(properties.Game), cardId, properties);
	const quantity = getNumber(properties.Quantity) ?? 1;
	const marketPrice =
		getNumber(properties["Market Price"]) ??
		getNumber(properties["Market Value"]) ??
		getNumber(properties.Price);

	return {
		id: page.id,
		pageUrl: page.url ?? null,
		name: name || cardId || "Untitled card",
		owner: getText(properties.Owner) || "Unassigned",
		cardId: cardId || "Unknown",
		game,
		set: getText(properties.Set) || getText(properties["Set Name"]),
		rarity: getText(properties.Rarity),
		color: getText(properties.Color),
		type: getText(properties.Type) || getText(properties["Card Type"]),
		quantity,
		marketPrice,
		imageUrl:
			getFileUrl(properties["Card Image"]) ??
			getFileUrl(properties.Image) ??
			getFileUrl(properties["Front image"]) ??
			getFileUrlFromCover(page.cover),
		tags: getMultiText(properties.Tags),
	};
}

export function summarizeCollection(
	cards: CollectionCardView[],
): CollectionSummaryView {
	const totalQuantity = cards.reduce((sum, card) => sum + card.quantity, 0);
	const totalMarketValue = cards.reduce(
		(sum, card) => sum + (card.marketPrice ?? 0) * card.quantity,
		0,
	);
	return {
		totalUniqueCards: cards.length,
		totalQuantity,
		totalMarketValue: roundCurrency(totalMarketValue),
		owners: groupBy(cards, (card) => card.owner),
		games: groupBy(cards, (card) => card.game),
	};
}

export function getText(property: NotionProperty | undefined): string | null {
	if (!property) return null;
	switch (property.type) {
		case "title":
			return plain(property.title);
		case "rich_text":
			return plain(property.rich_text);
		case "select":
			return property.select?.name?.trim() || null;
		case "status":
			return property.status?.name?.trim() || null;
		case "multi_select":
			return getMultiText(property).join(", ") || null;
		case "number":
			return typeof property.number === "number" ? String(property.number) : null;
		case "url":
			return property.url?.trim() || null;
		case "checkbox":
			return property.checkbox ? "Yes" : "No";
		default:
			return null;
	}
}

export function getNumber(property: NotionProperty | undefined): number | null {
	return property?.type === "number" && typeof property.number === "number"
		? property.number
		: null;
}

export function getMultiText(property: NotionProperty | undefined): string[] {
	if (property?.type !== "multi_select" || !Array.isArray(property.multi_select)) {
		return [];
	}
	return property.multi_select
		.map((item) => item.name?.trim())
		.filter((item): item is string => Boolean(item));
}

export function getFileUrl(property: NotionProperty | undefined): string | null {
	if (property?.type !== "files" || !Array.isArray(property.files)) return null;
	return property.files.map(getFileLikeUrl).find(Boolean) ?? null;
}

export function getFileUrlFromCover(cover: NotionFileLike | null | undefined): string | null {
	return getFileLikeUrl(cover);
}

function getFileLikeUrl(file: NotionFileLike | null | undefined): string | null {
	if (!file) return null;
	return file.external?.url ?? file.file?.url ?? null;
}

function plain(items: Array<{ plain_text?: string }> | undefined): string | null {
	const value = items?.map((item) => item.plain_text ?? "").join("").trim();
	return value || null;
}

function normalizeGame(
	game: string | null,
	cardId: string | null,
	properties: Record<string, NotionProperty>,
): CollectionCardView["game"] {
	const normalized = game?.toLowerCase() ?? "";
	if (normalized.includes("pokemon") || normalized.includes("pokémon")) return "Pokemon";
	if (normalized.includes("one piece") || normalized.includes("optcg")) return "One Piece";

	const id = cardId?.trim() ?? "";
	if (/^(OP|ST|EB|PRB|P)-?\d/i.test(id)) return "One Piece";
	if (/^[a-z]{2,}\d*-\d+[a-z]?$/i.test(id)) return "Pokemon";

	const set = getText(properties.Set) ?? "";
	if (/^(OP|ST|EB|PRB|P)-?\d/i.test(set)) return "One Piece";
	return "Unknown";
}

function groupBy(
	cards: CollectionCardView[],
	keyFn: (card: CollectionCardView) => string,
): Array<{ label: string; quantity: number; value: number }> {
	const groups = new Map<string, { quantity: number; value: number }>();
	for (const card of cards) {
		const key = keyFn(card);
		const previous = groups.get(key) ?? { quantity: 0, value: 0 };
		previous.quantity += card.quantity;
		previous.value += (card.marketPrice ?? 0) * card.quantity;
		groups.set(key, previous);
	}
	return [...groups.entries()]
		.map(([label, value]) => ({
			label,
			quantity: value.quantity,
			value: roundCurrency(value.value),
		}))
		.sort((a, b) => b.value - a.value || b.quantity - a.quantity);
}

function roundCurrency(value: number): number {
	return Math.round(value * 100) / 100;
}
