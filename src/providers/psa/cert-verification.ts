// Scaffold for PSA Public API — Cert Verification.
//
// PSA docs (https://www.psacard.com/publicapi) require an authenticated
// session to view the full endpoint reference. This module ships the
// **type contract** and **function signature** so the Worker can call
// `verifyPsaCert(certNumber, token)` once Spencer fills in the actual
// HTTP path and response parsing.
//
// Confirmed from the public landing page:
//   - Auth: OAuth 2 password grant against PSA login credentials
//   - Encoding: REST over HTTPS, JSON or XML responses
//   - Data: cert details, holder, item description, grade, population
//
// Unknown until docs are accessed:
//   - Base URL (likely `https://api.psacard.com/publicapi` per convention)
//   - Token endpoint path
//   - Exact JSON shape of the cert detail response

export const PSA_API_BASE_URL_PLACEHOLDER = "https://api.psacard.com/publicapi";

export type PsaCertVerification = {
	certNumber: string;
	specId: number | null;
	specNumber: string | null;
	cardGrade: string | null;
	grade: number | null;
	year: string | null;
	brand: string | null;
	sport: string | null;
	cardNumber: string | null;
	cardName: string | null;
	variety: string | null;
	totalPopulation: number | null;
	totalPopulationWithQualifier: number | null;
	populationHigher: number | null;
	isPSADNA: boolean | null;
	isDualCert: boolean | null;
	labelType: string | null;
};

export async function verifyPsaCert(
	_certNumber: string,
	_accessToken: string,
): Promise<PsaCertVerification> {
	throw new Error(
		"verifyPsaCert is not implemented yet. The PSA Public API endpoint reference is gated behind authentication at https://www.psacard.com/publicapi — fill in the exact endpoint path, response parsing, and error handling once the docs are accessible.",
	);
}
