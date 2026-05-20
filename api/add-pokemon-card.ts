import type { IncomingMessage, ServerResponse } from "node:http";
import {
	createNotionPageInDataSource,
	getNotionDataSource,
	getOwnedCardsDataSourceId,
} from "../src/vercel/notion-http.js";
import { buildPokemonOwnedCardProperties } from "../src/vercel/notion-write.js";
import { getPokemonCard } from "../src/vercel/pokemon.js";

type AddPokemonRequest = {
	cardId?: string;
	owner?: string;
	quantity?: number;
};

export default async function handler(
	req: IncomingMessage,
	res: ServerResponse,
) {
	if (req.method !== "POST") {
		return json(res, 405, { ok: false, error: "method_not_allowed" });
	}

	try {
		const body = (await readJson(req)) as AddPokemonRequest;
		const cardId = body.cardId?.trim();
		if (!cardId) return json(res, 400, { ok: false, error: "cardId_required" });

		const owner = body.owner?.trim() || process.env.DEFAULT_OWNER || "Spencer";
		const quantity = Math.max(1, Math.min(99, Math.floor(body.quantity ?? 1)));
		const dataSourceId = getOwnedCardsDataSourceId();
		const [dataSource, card] = await Promise.all([
			getNotionDataSource(dataSourceId),
			getPokemonCard(cardId),
		]);
		const properties = buildPokemonOwnedCardProperties({
			dataSource,
			card,
			owner,
			quantity,
		});

		const page = await createNotionPageInDataSource({
			dataSourceId,
			properties,
			coverUrl: card.imageUrl,
		});

		return json(res, 200, { ok: true, card, pageUrl: page.url ?? null });
	} catch (error) {
		return json(res, 500, {
			ok: false,
			error: error instanceof Error ? error.message : "unknown_error",
		});
	}
}

async function readJson(req: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	const body = Buffer.concat(chunks).toString("utf8");
	return body ? JSON.parse(body) : {};
}

function json(res: ServerResponse, status: number, body: unknown) {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(body));
}

