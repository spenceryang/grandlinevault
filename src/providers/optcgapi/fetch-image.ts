export const OPTCG_IMAGE_HOST = "optcgapi.com";
export const OPTCG_IMAGE_PATH_PREFIX = "/media/static/Card_Images/";

export type OptcgImageFetchResult = {
	blob: Blob;
	contentType: string;
	sizeBytes: number;
	filename: string;
	sourceUrl: string;
};

export async function fetchOptcgCardImage(
	imageUrl: string,
): Promise<OptcgImageFetchResult> {
	const url = parseOptcgImageUrl(imageUrl);
	const response = await fetch(url, {
		headers: { accept: "image/*" },
	});
	if (!response.ok) {
		throw new Error(`OPTCG image request failed with ${response.status}.`);
	}
	const blob = await response.blob();
	const contentType =
		response.headers.get("content-type") ?? blob.type ?? "image/jpeg";
	const filename = url.pathname.split("/").pop() ?? "card.jpg";
	return {
		blob,
		contentType,
		sizeBytes: blob.size,
		filename,
		sourceUrl: url.toString(),
	};
}

export function parseOptcgImageUrl(imageUrl: string): URL {
	let url: URL;
	try {
		url = new URL(imageUrl);
	} catch {
		throw new Error(`Invalid image URL: ${imageUrl}`);
	}
	if (url.hostname !== OPTCG_IMAGE_HOST) {
		throw new Error(
			`Expected an image URL on ${OPTCG_IMAGE_HOST}, got ${url.hostname}.`,
		);
	}
	if (!url.pathname.startsWith(OPTCG_IMAGE_PATH_PREFIX)) {
		throw new Error(
			`Image URL must live under ${OPTCG_IMAGE_PATH_PREFIX}, got ${url.pathname}.`,
		);
	}
	return url;
}

export async function fetchOptcgCardImages(
	imageUrls: ReadonlyArray<string>,
	options: { concurrency?: number } = {},
): Promise<OptcgImageFetchResult[]> {
	const concurrency = Math.max(1, options.concurrency ?? 4);
	const results = new Array<OptcgImageFetchResult>(imageUrls.length);
	let cursor = 0;
	const workers = Array.from({ length: concurrency }, async () => {
		while (cursor < imageUrls.length) {
			const index = cursor++;
			results[index] = await fetchOptcgCardImage(imageUrls[index]);
		}
	});
	await Promise.all(workers);
	return results;
}
