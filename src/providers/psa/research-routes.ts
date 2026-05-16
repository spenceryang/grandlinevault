// Scaffold for PSA Public API — analytical "research" routes.
// Covers: Population Report, Auction Prices, Price Guide, Card Facts.
//
// PSA docs (https://www.psacard.com/publicapi) require authentication
// to view full endpoint reference. This module ships the type contract
// and function signatures so call sites can be wired before Spencer fills
// in the actual paths / response parsing.
//
// Confirmed from the public PSA landing page:
//   - Auth: OAuth 2 password grant against PSA login credentials
//   - Encoding: REST over HTTPS, JSON or XML responses

export const PSA_API_BASE_URL_PLACEHOLDER = "https://api.psacard.com/publicapi";

export type PsaPopulationReport = {
	specId: number;
	specNumber: string | null;
	cardName: string | null;
	year: string | null;
	brand: string | null;
	sport: string | null;
	cardNumber: string | null;
	totalGraded: number;
	populationByGrade: Array<{ grade: number; count: number }>;
	populationWithQualifier: Array<{ grade: number; count: number }>;
	highestGrade: number | null;
};

export type PsaAuctionPrice = {
	auctionId: string;
	auctionHouse: string | null;
	saleDate: string | null;
	priceUsd: number | null;
	grade: number | null;
	certNumber: string | null;
	listingUrl: string | null;
};

export type PsaPriceGuideEntry = {
	specId: number;
	grade: number;
	price: number | null;
	currency: string;
	updatedAt: string | null;
};

export type PsaCardFacts = {
	specId: number;
	cardName: string | null;
	year: string | null;
	brand: string | null;
	sport: string | null;
	cardNumber: string | null;
	variety: string | null;
	notes: string | null;
	imageUrl: string | null;
};

export async function getPsaPopulationReport(
	_specId: number,
	_accessToken: string,
): Promise<PsaPopulationReport> {
	throw new Error(
		"getPsaPopulationReport is not implemented yet. Fill in the population endpoint and response parsing once the authenticated PSA docs are accessible.",
	);
}

export async function getPsaAuctionPrices(
	_specId: number,
	_accessToken: string,
): Promise<PsaAuctionPrice[]> {
	throw new Error(
		"getPsaAuctionPrices is not implemented yet. Fill in the auction-prices endpoint and response parsing once the authenticated PSA docs are accessible.",
	);
}

export async function getPsaPriceGuide(
	_specId: number,
	_accessToken: string,
): Promise<PsaPriceGuideEntry[]> {
	throw new Error(
		"getPsaPriceGuide is not implemented yet. Fill in the price-guide endpoint and response parsing once the authenticated PSA docs are accessible.",
	);
}

export async function getPsaCardFacts(
	_specId: number,
	_accessToken: string,
): Promise<PsaCardFacts> {
	throw new Error(
		"getPsaCardFacts is not implemented yet. Fill in the card-facts endpoint and response parsing once the authenticated PSA docs are accessible.",
	);
}
