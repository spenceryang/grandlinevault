import { config, requireEnv } from "../config.js";

export type SlackOwnerMap = Record<string, string>;

export type DownloadedSlackImage = {
	blob: Blob;
	filename: string;
	contentType: string;
	byteLength: number;
};

const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export function parseSlackOwnerMap(value = config.slackOwnerMap ?? ""): SlackOwnerMap {
	const trimmed = value.trim();
	if (!trimmed) return {};

	if (trimmed.startsWith("{")) {
		const parsed = JSON.parse(trimmed) as Record<string, unknown>;
		return Object.fromEntries(
			Object.entries(parsed)
				.filter((entry): entry is [string, string] => typeof entry[1] === "string")
				.map(([key, owner]) => [key.trim(), owner.trim()])
				.filter(([key, owner]) => key && owner),
		);
	}

	return Object.fromEntries(
		trimmed
			.split(",")
			.map((pair) => pair.trim())
			.filter(Boolean)
			.map((pair) => pair.split(":"))
			.filter((parts): parts is [string, string] => parts.length >= 2)
			.map(([key, owner]) => [key.trim(), owner.trim()])
			.filter(([key, owner]) => key && owner),
	);
}

export function resolveSlackOwnerName(input: {
	ownerName?: string | null;
	slackUserId?: string | null;
	ownerMap?: SlackOwnerMap;
	defaultOwner?: string;
}): string {
	const explicitOwner = input.ownerName?.trim();
	if (explicitOwner) return explicitOwner;

	const slackUserId = input.slackUserId?.trim();
	if (slackUserId) {
		const owner = (input.ownerMap ?? parseSlackOwnerMap())[slackUserId]?.trim();
		if (owner) return owner;
	}

	return input.defaultOwner ?? "Spencer";
}

export async function downloadSlackImage(input: {
	url: string;
	botToken?: string | null;
	filename?: string | null;
	maxBytes?: number;
}): Promise<DownloadedSlackImage> {
	const token = input.botToken ?? config.slackBotToken;
	const headers: Record<string, string> = {};
	if (token) headers.Authorization = `Bearer ${token}`;

	const response = await fetch(input.url, { headers });
	if (!response.ok) {
		throw new Error(`Slack image download failed with ${response.status}.`);
	}

	const contentType = response.headers.get("content-type") ?? "application/octet-stream";
	if (!contentType.toLowerCase().startsWith("image/")) {
		throw new Error(`Slack file is not an image: ${contentType}.`);
	}

	const contentLength = Number(response.headers.get("content-length") ?? 0);
	const maxBytes = input.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
	if (contentLength > maxBytes) {
		throw new Error(`Slack image is too large: ${contentLength} bytes.`);
	}

	const blob = await response.blob();
	if (blob.size > maxBytes) {
		throw new Error(`Slack image is too large: ${blob.size} bytes.`);
	}

	return {
		blob,
		filename: input.filename?.trim() || filenameFromUrl(input.url, contentType),
		contentType,
		byteLength: blob.size,
	};
}

export function filenameFromUrl(url: string, contentType: string): string {
	try {
		const parsed = new URL(url);
		const lastPath = parsed.pathname.split("/").filter(Boolean).at(-1);
		if (lastPath?.includes(".")) return decodeURIComponent(lastPath).slice(0, 180);
	} catch {
		// Fall through to MIME-derived filename.
	}

	const extension = extensionFromContentType(contentType);
	return `slack-card-scan.${extension}`;
}

function extensionFromContentType(contentType: string): string {
	const normalized = contentType.toLowerCase().split(";")[0]?.trim();
	switch (normalized) {
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
		case "image/heic":
			return "heic";
		case "image/gif":
			return "gif";
		case "image/jpeg":
		case "image/jpg":
		default:
			return "jpg";
	}
}

export function requireSlackBotToken(): string {
	return requireEnv(config.slackBotToken, "SLACK_BOT_TOKEN");
}
