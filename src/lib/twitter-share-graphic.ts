export type TwitterCardListing = {
	name: string;
	cardId: string;
	imageUrl: string;
	marketPrice?: number | null;
};

export type TwitterShareGraphicInput = {
	headline: string;
	subhead?: string | null;
	handle?: string | null;
	tweetText?: string | null;
	hashtags?: ReadonlyArray<string>;
	listings: ReadonlyArray<TwitterCardListing>;
	notionPublicUrl?: string | null;
	generatedAt?: Date;
};

export type TwitterShareGraphicOptions = {
	width?: number;
	height?: number;
	background?: string;
	accent?: string;
	textColor?: string;
	maxListings?: number;
};

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 675; // Twitter / X 16:9 in-feed image
const DEFAULT_BACKGROUND = "#0c0e16";
const DEFAULT_ACCENT = "#1da1f2";
const DEFAULT_TEXT = "#f4f4f5";
const DEFAULT_MAX_LISTINGS = 4;

export function buildTwitterShareGraphicSvg(
	input: TwitterShareGraphicInput,
	options: TwitterShareGraphicOptions = {},
): string {
	const width = options.width ?? DEFAULT_WIDTH;
	const height = options.height ?? DEFAULT_HEIGHT;
	const background = options.background ?? DEFAULT_BACKGROUND;
	const accent = options.accent ?? DEFAULT_ACCENT;
	const textColor = options.textColor ?? DEFAULT_TEXT;
	const maxListings = Math.max(1, options.maxListings ?? DEFAULT_MAX_LISTINGS);
	const listings = input.listings.slice(0, maxListings);

	const padding = 48;
	const handle = input.handle ? formatHandle(input.handle) : null;
	const handleY = padding + 30;
	const headlineY = handle ? handleY + 60 : padding + 50;
	const tweetY = headlineY + 36;
	const tweetSize = 22;
	const tweetMax = 110;
	const tweetLines = input.tweetText
		? wrapText(input.tweetText, tweetMax).slice(0, 3)
		: [];
	const tweetTextY = tweetY + 30;
	const tweetTextEnd = tweetTextY + tweetLines.length * (tweetSize + 6);

	const hashtags =
		input.hashtags && input.hashtags.length > 0
			? input.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join("  ")
			: null;
	const hashtagY = hashtags ? tweetTextEnd + 16 : tweetTextEnd;

	const tilesTop = Math.max(headlineY + 60, hashtagY + 12);
	const footerHeight = 90;
	const tilesBottom = height - footerHeight;
	const tilesAreaHeight = Math.max(0, tilesBottom - tilesTop);
	const tileSpacing = 18;
	const tileCount = Math.max(1, listings.length);
	const tileWidth =
		(width - padding * 2 - (tileCount - 1) * tileSpacing) / tileCount;
	const tileHeight = Math.min(tilesAreaHeight - 16, tileWidth * 1.4);

	const tiles = listings
		.map((listing, i) => {
			const x = padding + i * (tileWidth + tileSpacing);
			const y = tilesTop + (tilesAreaHeight - tileHeight) / 2;
			return [
				`<g>`,
				`<rect x="${x}" y="${y}" width="${tileWidth}" height="${tileHeight}" rx="16" fill="${escapeAttr(accent)}" opacity="0.08" />`,
				`<image x="${x}" y="${y}" width="${tileWidth}" height="${tileHeight}" href="${escapeAttr(listing.imageUrl)}" preserveAspectRatio="xMidYMid slice" />`,
				typeof listing.marketPrice === "number"
					? `<rect x="${x + tileWidth - 110}" y="${y + 12}" width="98" height="28" rx="6" fill="${escapeAttr(accent)}" />`
					: "",
				typeof listing.marketPrice === "number"
					? `<text x="${x + tileWidth - 61}" y="${y + 31}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700">$${listing.marketPrice.toFixed(0)}</text>`
					: "",
				`</g>`,
			].join("");
		})
		.join("");

	const generatedAt = (input.generatedAt ?? new Date())
		.toISOString()
		.slice(0, 10);
	const footerY = height - 32;

	const tweetLinesSvg = tweetLines
		.map(
			(line, i) =>
				`<text x="${padding}" y="${tweetTextY + i * (tweetSize + 6)}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="${tweetSize}" opacity="0.85">${escapeText(line)}</text>`,
		)
		.join("");

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		`<defs>`,
		`<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">`,
		`<stop offset="0%" stop-color="${escapeAttr(background)}" />`,
		`<stop offset="100%" stop-color="${escapeAttr(darken(background))}" />`,
		`</linearGradient>`,
		`</defs>`,
		`<rect width="${width}" height="${height}" fill="url(#bg)" />`,
		handle
			? `<text x="${padding}" y="${handleY}" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700">${escapeText(handle)}</text>`
			: "",
		`<text x="${padding}" y="${headlineY}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="800">${escapeText(input.headline)}</text>`,
		input.subhead
			? `<text x="${padding}" y="${headlineY + 30}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="18" opacity="0.7">${escapeText(input.subhead)}</text>`
			: "",
		tweetLinesSvg,
		hashtags
			? `<text x="${padding}" y="${hashtagY + tweetSize}" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="600">${escapeText(hashtags)}</text>`
			: "",
		tiles,
		input.notionPublicUrl
			? `<text x="${padding}" y="${footerY}" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="600">${escapeText(input.notionPublicUrl)}</text>`
			: "",
		`<text x="${width - padding}" y="${footerY}" text-anchor="end" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="14" opacity="0.5">Grand Line Vault · ${generatedAt}</text>`,
		`</svg>`,
	].join("");
}

export function formatHandle(handle: string): string {
	const trimmed = handle.trim();
	if (!trimmed) return "";
	return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function wrapText(text: string, max: number): string[] {
	const cleaned = text.trim().replace(/\s+/g, " ");
	if (!cleaned) return [];
	const words = cleaned.split(" ");
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		if (!current.length) {
			current = word;
			continue;
		}
		if (current.length + 1 + word.length <= max) {
			current = `${current} ${word}`;
		} else {
			lines.push(current);
			current = word;
		}
	}
	if (current) lines.push(current);
	return lines;
}

function escapeText(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
	return value.replace(/"/g, "&quot;").replace(/&/g, "&amp;");
}

function darken(hex: string, amount = 0.4): string {
	if (!hex.startsWith("#") || hex.length !== 7) return hex;
	const r = Math.max(0, Math.floor(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
	const g = Math.max(0, Math.floor(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
	const b = Math.max(0, Math.floor(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
