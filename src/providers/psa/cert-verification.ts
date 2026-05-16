// PSA Public API — Cert Verification.
//
// Confirmed endpoints (from public docs + published clients):
//   GET https://api.psacard.com/publicapi/cert/GetByCertNumber/{certNumber}
//   GET https://api.psacard.com/publicapi/cert/GetImagesByCertNumber/{certNumber}
//
// Auth: Authorization: bearer <token>. The bearer token is generated once
// from the PSA developer dashboard (https://www.psacard.com/publicapi/documentation)
// — there's no end-user OAuth flow to run, the token is a long-lived secret
// that lives in `.env` as PSA_AUTHORIZATION_TOKEN.
//
// Free tier: 100 calls/day (per PSA's public docs).

export const PSA_API_BASE_URL = "https://api.psacard.com/publicapi";

export type PsaCertRaw = {
	PSACert: {
		CertNumber: string;
		SpecID?: number;
		SpecNumber?: string;
		LabelType?: string;
		ReverseBarCode?: boolean;
		Year?: string;
		Brand?: string;
		Category?: string;
		CardNumber?: string;
		Subject?: string;
		Variety?: string;
		IsPSADNA?: boolean;
		IsDualCert?: boolean;
		GradeDescription?: string;
		CardGrade?: string;
		TotalPopulation?: number;
		TotalPopulationWithQualifier?: number;
		PopulationHigher?: number;
	};
};

export type PsaCertVerification = {
	certNumber: string;
	specId: number | null;
	specNumber: string | null;
	cardGrade: string | null;
	gradeDescription: string | null;
	year: string | null;
	brand: string | null;
	category: string | null;
	cardNumber: string | null;
	cardName: string | null;
	variety: string | null;
	labelType: string | null;
	isPsaDna: boolean;
	isDualCert: boolean;
	totalPopulation: number | null;
	totalPopulationWithQualifier: number | null;
	populationHigher: number | null;
};

export type PsaCertImage = {
	imageType: "front" | "back";
	imageUrl: string;
};

export type PsaCertImagesRaw = Array<{
	IsFrontImage?: boolean;
	ImageURL?: string;
}>;

export async function verifyPsaCert(
	certNumber: string,
	accessToken: string,
): Promise<PsaCertVerification> {
	const cert = certNumber.trim();
	if (!cert) {
		throw new Error("certNumber must not be empty.");
	}
	if (!accessToken) {
		throw new Error(
			"PSA_AUTHORIZATION_TOKEN must be provided. Generate one at https://www.psacard.com/publicapi/documentation.",
		);
	}
	const response = await fetch(
		`${PSA_API_BASE_URL}/cert/GetByCertNumber/${encodeURIComponent(cert)}`,
		{
			headers: {
				Authorization: `bearer ${accessToken}`,
				accept: "application/json",
			},
		},
	);
	if (response.status === 401 || response.status === 403) {
		throw new Error(
			"PSA rejected the access token. Confirm it was generated under an active account at https://www.psacard.com/publicapi/documentation.",
		);
	}
	if (response.status === 404) {
		throw new Error(`PSA cert not found: ${cert}`);
	}
	if (response.status === 429) {
		throw new Error(
			"PSA rate limit hit (free tier is 100 calls/day). Retry after the daily reset or upgrade the plan.",
		);
	}
	if (!response.ok) {
		throw new Error(`PSA API request failed with ${response.status}.`);
	}
	const raw = (await response.json()) as PsaCertRaw;
	return toCertVerification(raw);
}

export async function getPsaCertImages(
	certNumber: string,
	accessToken: string,
): Promise<PsaCertImage[]> {
	const cert = certNumber.trim();
	if (!cert) {
		throw new Error("certNumber must not be empty.");
	}
	if (!accessToken) {
		throw new Error(
			"PSA_AUTHORIZATION_TOKEN must be provided. Generate one at https://www.psacard.com/publicapi/documentation.",
		);
	}
	const response = await fetch(
		`${PSA_API_BASE_URL}/cert/GetImagesByCertNumber/${encodeURIComponent(cert)}`,
		{
			headers: {
				Authorization: `bearer ${accessToken}`,
				accept: "application/json",
			},
		},
	);
	if (response.status === 401 || response.status === 403) {
		throw new Error("PSA rejected the access token.");
	}
	if (response.status === 404) {
		return [];
	}
	if (!response.ok) {
		throw new Error(`PSA API request failed with ${response.status}.`);
	}
	const raw = (await response.json()) as PsaCertImagesRaw;
	return raw
		.filter((entry) => typeof entry.ImageURL === "string")
		.map((entry) => ({
			imageType: entry.IsFrontImage === false ? "back" : "front",
			imageUrl: entry.ImageURL as string,
		}));
}

export function toCertVerification(raw: PsaCertRaw): PsaCertVerification {
	const cert = raw.PSACert ?? ({} as PsaCertRaw["PSACert"]);
	return {
		certNumber: cert.CertNumber ?? "",
		specId: cert.SpecID ?? null,
		specNumber: cert.SpecNumber ?? null,
		cardGrade: cert.CardGrade ?? null,
		gradeDescription: cert.GradeDescription ?? null,
		year: cert.Year ?? null,
		brand: cert.Brand ?? null,
		category: cert.Category ?? null,
		cardNumber: cert.CardNumber ?? null,
		cardName: cert.Subject ?? null,
		variety: cert.Variety ?? null,
		labelType: cert.LabelType ?? null,
		isPsaDna: cert.IsPSADNA ?? false,
		isDualCert: cert.IsDualCert ?? false,
		totalPopulation: cert.TotalPopulation ?? null,
		totalPopulationWithQualifier: cert.TotalPopulationWithQualifier ?? null,
		populationHigher: cert.PopulationHigher ?? null,
	};
}
