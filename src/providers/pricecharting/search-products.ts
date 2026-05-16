export const PRICECHARTING_API_BASE = "https://www.pricecharting.com";

export type PriceChartingProductRaw = {
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
	"bgs-10-price"?: number;
	"condition-17-price"?: number;
	"condition-18-price"?: number;
};

export type PriceChartingProductSummary = {
	id: string;
	productName: string;
	consoleName: string | null;
	releaseDate: string | null;
	upc: string | null;
	genre: string | null;
	prices: {
		loose: number | null;
		cib: number | null;
		new: number | null;
		graded: number | null;
		bgs10: number | null;
		cgc10: number | null;
		sgc10: number | null;
	};
};

export type PriceChartingSearchResponse = {
	status: "success" | "error";
	"error-message"?: string;
	products?: PriceChartingProductRaw[];
};

export async function searchPriceChartingProducts(
	query: string,
	apiToken: string,
): Promise<PriceChartingProductSummary[]> {
	if (!apiToken) {
		throw new Error("PriceCharting API token is required (PRICECHARTING_API_TOKEN).");
	}
	const trimmed = query.trim();
	if (!trimmed) {
		throw new Error("query must not be empty.");
	}
	const params = new URLSearchParams({ t: apiToken, q: trimmed });
	const url = `${PRICECHARTING_API_BASE}/api/products?${params.toString()}`;
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
	const payload = (await response.json()) as PriceChartingSearchResponse;
	if (payload.status === "error") {
		throw new Error(payload["error-message"] || "PriceCharting returned an error.");
	}
	return (payload.products ?? []).map(toProductSummary);
}

export function toProductSummary(
	raw: PriceChartingProductRaw,
): PriceChartingProductSummary {
	return {
		id: String(raw.id ?? ""),
		productName: raw["product-name"] ?? "",
		consoleName: raw["console-name"] ?? null,
		releaseDate: raw["release-date"] ?? null,
		upc: raw.upc ?? null,
		genre: raw.genre ?? null,
		prices: {
			loose: penniesToDollars(raw["loose-price"]),
			cib: penniesToDollars(raw["cib-price"]),
			new: penniesToDollars(raw["new-price"]),
			graded: penniesToDollars(raw["graded-price"]),
			bgs10: penniesToDollars(raw["bgs-10-price"]),
			cgc10: penniesToDollars(raw["condition-17-price"]),
			sgc10: penniesToDollars(raw["condition-18-price"]),
		},
	};
}

function penniesToDollars(value: number | undefined): number | null {
	if (typeof value !== "number" || Number.isNaN(value)) return null;
	return Math.round(value) / 100;
}
