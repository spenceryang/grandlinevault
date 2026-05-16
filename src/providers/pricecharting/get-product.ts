export const PRICECHARTING_API_BASE = "https://www.pricecharting.com";

export type PriceChartingProductRaw = {
	status: "success" | "error";
	"error-message"?: string;
	id?: number | string;
	"product-name"?: string;
	"console-name"?: string;
	"release-date"?: string;
	upc?: string;
	asin?: string;
	epid?: string;
	genre?: string;
	"sales-volume"?: number;
	"loose-price"?: number;
	"cib-price"?: number;
	"new-price"?: number;
	"graded-price"?: number;
	"box-only-price"?: number;
	"manual-only-price"?: number;
	"bgs-10-price"?: number;
	"condition-17-price"?: number;
	"condition-18-price"?: number;
	"gamestop-price"?: number;
	"retail-loose-buy"?: number;
	"retail-loose-sell"?: number;
	"retail-cib-buy"?: number;
	"retail-cib-sell"?: number;
	"retail-new-buy"?: number;
	"retail-new-sell"?: number;
};

export type PriceChartingProduct = {
	id: string;
	productName: string;
	consoleName: string | null;
	releaseDate: string | null;
	upc: string | null;
	asin: string | null;
	epid: string | null;
	genre: string | null;
	salesVolume: number | null;
	prices: {
		loose: number | null;
		cib: number | null;
		new: number | null;
		graded: number | null;
		boxOnly: number | null;
		manualOnly: number | null;
		bgs10: number | null;
		cgc10: number | null;
		sgc10: number | null;
		gamestop: number | null;
	};
	retail: {
		looseBuy: number | null;
		looseSell: number | null;
		cibBuy: number | null;
		cibSell: number | null;
		newBuy: number | null;
		newSell: number | null;
	};
};

export type PriceChartingLookupOptions =
	| { id: string }
	| { upc: string }
	| { q: string };

export async function getPriceChartingProduct(
	options: PriceChartingLookupOptions,
	apiToken: string,
): Promise<PriceChartingProduct> {
	if (!apiToken) {
		throw new Error("PriceCharting API token is required (PRICECHARTING_API_TOKEN).");
	}
	const params = new URLSearchParams({ t: apiToken });
	if ("id" in options) params.set("id", String(options.id).trim());
	else if ("upc" in options) params.set("upc", options.upc.trim());
	else if ("q" in options) params.set("q", options.q.trim());
	else {
		throw new Error("Lookup requires one of: id, upc, q.");
	}
	const lookupKey = params.get("id") ?? params.get("upc") ?? params.get("q");
	if (!lookupKey) {
		throw new Error("Lookup parameter must not be empty.");
	}

	const url = `${PRICECHARTING_API_BASE}/api/product?${params.toString()}`;
	const response = await fetch(url, {
		headers: { accept: "application/json" },
	});
	if (response.status === 401 || response.status === 403) {
		throw new Error(
			"PriceCharting rejected the API token. Confirm the subscription is active.",
		);
	}
	if (!response.ok) {
		throw new Error(
			`PriceCharting API request failed with ${response.status}.`,
		);
	}
	const raw = (await response.json()) as PriceChartingProductRaw;
	if (raw.status === "error") {
		throw new Error(raw["error-message"] || "PriceCharting returned an error.");
	}
	return toProduct(raw);
}

export function toProduct(raw: PriceChartingProductRaw): PriceChartingProduct {
	return {
		id: String(raw.id ?? ""),
		productName: raw["product-name"] ?? "",
		consoleName: raw["console-name"] ?? null,
		releaseDate: raw["release-date"] ?? null,
		upc: raw.upc ?? null,
		asin: raw.asin ?? null,
		epid: raw.epid ?? null,
		genre: raw.genre ?? null,
		salesVolume: raw["sales-volume"] ?? null,
		prices: {
			loose: penniesToDollars(raw["loose-price"]),
			cib: penniesToDollars(raw["cib-price"]),
			new: penniesToDollars(raw["new-price"]),
			graded: penniesToDollars(raw["graded-price"]),
			boxOnly: penniesToDollars(raw["box-only-price"]),
			manualOnly: penniesToDollars(raw["manual-only-price"]),
			bgs10: penniesToDollars(raw["bgs-10-price"]),
			cgc10: penniesToDollars(raw["condition-17-price"]),
			sgc10: penniesToDollars(raw["condition-18-price"]),
			gamestop: penniesToDollars(raw["gamestop-price"]),
		},
		retail: {
			looseBuy: penniesToDollars(raw["retail-loose-buy"]),
			looseSell: penniesToDollars(raw["retail-loose-sell"]),
			cibBuy: penniesToDollars(raw["retail-cib-buy"]),
			cibSell: penniesToDollars(raw["retail-cib-sell"]),
			newBuy: penniesToDollars(raw["retail-new-buy"]),
			newSell: penniesToDollars(raw["retail-new-sell"]),
		},
	};
}

function penniesToDollars(value: number | undefined): number | null {
	if (typeof value !== "number" || Number.isNaN(value)) return null;
	return Math.round(value) / 100;
}
