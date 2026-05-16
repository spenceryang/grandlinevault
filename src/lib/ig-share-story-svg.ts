export type IgStoryCardListing = {
	name: string;
	cardId: string;
	imageUrl: string;
	askingPrice?: number | null;
	condition?: string | null;
};

export type IgShareStoryInput = {
	headline: string;
	sellerName?: string | null;
	subhead?: string | null;
	ctaPrimary?: string | null;
	ctaSecondary?: string | null;
	listings: ReadonlyArray<IgStoryCardListing>;
	notionPublicUrl?: string | null;
	generatedAt?: Date;
};

export type IgShareStoryOptions = {
	width?: number;
	height?: number;
	background?: string;
	accent?: string;
	textColor?: string;
	maxListings?: number;
};

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
const DEFAULT_BACKGROUND = "#0c0e16";
const DEFAULT_ACCENT = "#ffb547";
const DEFAULT_TEXT = "#f4f4f5";
const DEFAULT_MAX_LISTINGS = 6;

export function buildIgShareStorySvg(
	input: IgShareStoryInput,
	options: IgShareStoryOptions = {},
): string {
	const width = options.width ?? DEFAULT_WIDTH;
	const height = options.height ?? DEFAULT_HEIGHT;
	const background = options.background ?? DEFAULT_BACKGROUND;
	const accent = options.accent ?? DEFAULT_ACCENT;
	const textColor = options.textColor ?? DEFAULT_TEXT;
	const maxListings = Math.max(1, options.maxListings ?? DEFAULT_MAX_LISTINGS);
	const listings = input.listings.slice(0, maxListings);

	const padding = 72;
	const headerY = padding + 120;
	const subheadY = headerY + 70;
	const gridTop = subheadY + 90;
	const gridBottom = height - 320;
	const gridHeight = gridBottom - gridTop;

	const columns = listings.length <= 2 ? 1 : 2;
	const rows = Math.ceil(listings.length / columns);
	const tileSpacing = 28;
	const tileWidth =
		(width - padding * 2 - (columns - 1) * tileSpacing) / columns;
	const tileHeight = Math.min(
		(gridHeight - (rows - 1) * tileSpacing) / rows,
		tileWidth * 1.4 + 70,
	);

	const tiles = listings
		.map((listing, i) => {
			const col = i % columns;
			const row = Math.floor(i / columns);
			const x = padding + col * (tileWidth + tileSpacing);
			const y = gridTop + row * (tileHeight + tileSpacing);
			const imageHeight = tileHeight - 70;
			const priceLabel =
				typeof listing.askingPrice === "number"
					? `$${listing.askingPrice.toFixed(2)}`
					: "DM for price";
			const conditionLabel = listing.condition ? ` · ${listing.condition}` : "";
			return [
				`<g>`,
				`<rect x="${x}" y="${y}" width="${tileWidth}" height="${tileHeight}" rx="22" fill="${escapeAttr(accent)}" opacity="0.08" />`,
				`<image x="${x}" y="${y}" width="${tileWidth}" height="${imageHeight}" href="${escapeAttr(listing.imageUrl)}" preserveAspectRatio="xMidYMid slice" />`,
				`<text x="${x + tileWidth / 2}" y="${y + imageHeight + 32}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700">${escapeText(truncate(listing.name, 24))}</text>`,
				`<text x="${x + tileWidth / 2}" y="${y + imageHeight + 56}" text-anchor="middle" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="600">${escapeText(priceLabel)}${escapeText(conditionLabel)}</text>`,
				`</g>`,
			].join("");
		})
		.join("");

	const sellerLine = input.sellerName
		? `Seller: ${escapeText(input.sellerName)}`
		: "";
	const subhead =
		input.subhead ??
		`${listings.length} card${listings.length === 1 ? "" : "s"} available`;
	const generatedAt = (input.generatedAt ?? new Date())
		.toISOString()
		.slice(0, 10);

	const ctaY = height - 220;
	const cta1 = input.ctaPrimary ?? "DM to buy";
	const cta2 = input.ctaSecondary ?? null;
	const linkY = height - 80;

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		`<defs>`,
		`<linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">`,
		`<stop offset="0%" stop-color="${escapeAttr(background)}" />`,
		`<stop offset="100%" stop-color="${escapeAttr(darken(background))}" />`,
		`</linearGradient>`,
		`</defs>`,
		`<rect width="${width}" height="${height}" fill="url(#bg)" />`,
		`<rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}" rx="40" fill="none" stroke="${escapeAttr(accent)}" stroke-width="2" opacity="0.4" />`,
		`<text x="${width / 2}" y="${headerY}" text-anchor="middle" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="0.2em">FOR SALE</text>`,
		`<text x="${width / 2}" y="${headerY + 64}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="800">${escapeText(input.headline)}</text>`,
		`<text x="${width / 2}" y="${subheadY + 22}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="24" opacity="0.75">${escapeText(subhead)}</text>`,
		tiles,
		sellerLine
			? `<text x="${width / 2}" y="${ctaY - 40}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="22" opacity="0.7">${sellerLine}</text>`
			: "",
		`<text x="${width / 2}" y="${ctaY}" text-anchor="middle" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="800">${escapeText(cta1)}</text>`,
		cta2
			? `<text x="${width / 2}" y="${ctaY + 50}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="24">${escapeText(cta2)}</text>`
			: "",
		input.notionPublicUrl
			? `<text x="${width / 2}" y="${linkY}" text-anchor="middle" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="600">${escapeText(input.notionPublicUrl)}</text>`
			: "",
		`<text x="${width / 2}" y="${linkY + 30}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="16" opacity="0.5">Generated ${generatedAt} via Grand Line Vault</text>`,
		`</svg>`,
	].join("");
}

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max - 1)}…`;
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
