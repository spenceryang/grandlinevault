import type { IncomingMessage, ServerResponse } from "node:http";
import {
	getOwnedCardsDataSourceId,
	queryNotionDataSource,
} from "../src/vercel/notion-http.js";
import {
	normalizeCollectionPage,
	summarizeCollection,
} from "../src/vercel/collection-view.js";

export default async function handler(
	req: IncomingMessage,
	res: ServerResponse,
) {
	if (req.method !== "GET") {
		return json(res, 405, { ok: false, error: "method_not_allowed" });
	}

	try {
		const dataSourceId = getOwnedCardsDataSourceId();
		const cards = [];
		let cursor: string | undefined;
		do {
			const page = await queryNotionDataSource(dataSourceId, {
				pageSize: 100,
				startCursor: cursor,
			});
			cards.push(
				...page.results
					.map(normalizeCollectionPage)
					.filter((card): card is NonNullable<typeof card> => Boolean(card)),
			);
			cursor = page.next_cursor ?? undefined;
		} while (cursor);

		const url = new URL(req.url ?? "/api/collection", "http://localhost");
		const owner = url.searchParams.get("owner")?.toLowerCase();
		const game = url.searchParams.get("game")?.toLowerCase();
		const query = url.searchParams.get("q")?.toLowerCase();

		const filtered = cards.filter((card) => {
			if (owner && card.owner.toLowerCase() !== owner) return false;
			if (game && card.game.toLowerCase() !== game) return false;
			if (
				query &&
				![card.name, card.cardId, card.set, card.rarity, card.type]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(query)
			) {
				return false;
			}
			return true;
		});

		return json(res, 200, {
			ok: true,
			cards: filtered,
			summary: summarizeCollection(filtered),
			unfilteredSummary: summarizeCollection(cards),
		});
	} catch (error) {
		return json(res, 500, {
			ok: false,
			error: error instanceof Error ? error.message : "unknown_error",
		});
	}
}

function json(res: ServerResponse, status: number, body: unknown) {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
	res.end(JSON.stringify(body));
}

