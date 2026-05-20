import type { IncomingMessage, ServerResponse } from "node:http";
import { searchPokemonCards } from "../src/vercel/pokemon.js";

export default async function handler(
	req: IncomingMessage,
	res: ServerResponse,
) {
	if (req.method !== "GET") {
		return json(res, 405, { ok: false, error: "method_not_allowed" });
	}

	try {
		const url = new URL(req.url ?? "/api/pokemon-search", "http://localhost");
		const query = url.searchParams.get("q") ?? "";
		const cards = await searchPokemonCards(query);
		return json(res, 200, { ok: true, cards });
	} catch (error) {
		return json(res, 400, {
			ok: false,
			error: error instanceof Error ? error.message : "unknown_error",
		});
	}
}

function json(res: ServerResponse, status: number, body: unknown) {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
	res.end(JSON.stringify(body));
}

