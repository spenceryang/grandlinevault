// Scaffold for PSA Public API — OAuth 2 password-grant flow.
//
// PSA docs (https://www.psacard.com/publicapi) state:
//   "For security, we use OAuth 2 with password grant to obtain an access
//    token for you using your PSA login credentials."
//
// The full token endpoint URL is gated behind the authenticated docs page.
// This module ships the type contract + function signature so call sites
// can pass credentials in, get a typed token back, and refresh on expiry —
// spencer fills in the actual token URL and request body once the docs
// are accessible.

export const PSA_TOKEN_ENDPOINT_PLACEHOLDER =
	"https://api.psacard.com/oauth/token";

export type PsaCredentials = {
	username: string;
	password: string;
	clientId: string;
	clientSecret: string;
};

export type PsaAccessToken = {
	accessToken: string;
	tokenType: "Bearer";
	expiresAt: string;
	refreshToken: string | null;
	scope: string | null;
};

export async function getPsaAccessToken(
	_credentials: PsaCredentials,
): Promise<PsaAccessToken> {
	throw new Error(
		"getPsaAccessToken is not implemented yet. PSA's OAuth 2 password-grant token endpoint is documented behind https://www.psacard.com/publicapi after sign-in. Fill in the exact endpoint URL, request body (grant_type=password, username, password, client_id, client_secret), and response parsing once the docs are accessible.",
	);
}

export function isTokenExpired(
	token: Pick<PsaAccessToken, "expiresAt">,
	now: Date = new Date(),
	skewSeconds = 30,
): boolean {
	const expiresAt = new Date(token.expiresAt).getTime();
	if (Number.isNaN(expiresAt)) return true;
	return now.getTime() + skewSeconds * 1000 >= expiresAt;
}
