export type ShareCollectionFavoriteCard = {
	name: string;
	cardSetId: string;
	imageUrl: string;
	rarity?: string | null;
	marketPrice?: number | null;
};

export type ShareCollectionGraphicInput = {
	ownerName: string;
	collectionTitle?: string;
	notionPublicUrl: string;
	totalCards?: number | null;
	totalMarketValue?: number | null;
	favoriteCards: ReadonlyArray<ShareCollectionFavoriteCard>;
	tagline?: string | null;
	generatedAt?: Date;
};

export type ShareCollectionGraphicOptions = {
	width?: number;
	height?: number;
	background?: string;
	accent?: string;
	textColor?: string;
	maxFavoriteCards?: number;
};

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const DEFAULT_BACKGROUND = "#0c0e16";
const DEFAULT_ACCENT = "#ffb547";
const DEFAULT_TEXT = "#f4f4f5";
const DEFAULT_MAX_FAVORITES = 4;

export function buildShareCollectionSvg(
	input: ShareCollectionGraphicInput,
	options: ShareCollectionGraphicOptions = {},
): string {
	const width = options.width ?? DEFAULT_WIDTH;
	const height = options.height ?? DEFAULT_HEIGHT;
	const background = options.background ?? DEFAULT_BACKGROUND;
	const accent = options.accent ?? DEFAULT_ACCENT;
	const textColor = options.textColor ?? DEFAULT_TEXT;
	const maxFavorites = Math.max(1, options.maxFavoriteCards ?? DEFAULT_MAX_FAVORITES);
	const favorites = input.favoriteCards.slice(0, maxFavorites);

	const padding = 48;
	const headerY = padding + 32;
	const cardAreaTop = headerY + 80;
	const cardAreaBottom = height - 130;
	const cardAreaHeight = cardAreaBottom - cardAreaTop;
	const cardWidth = (width - padding * 2 - (favorites.length - 1) * 24) / favorites.length;
	const cardHeight = Math.min(cardAreaHeight, cardWidth * 1.4);

	const cardsSvg = favorites
		.map((card, i) => {
			const x = padding + i * (cardWidth + 24);
			const y = cardAreaTop + (cardAreaHeight - cardHeight) / 2;
			return [
				`<g>`,
				`<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="14" fill="${escapeAttr(accent)}" opacity="0.08" />`,
				`<image x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" href="${escapeAttr(card.imageUrl)}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 14px)" />`,
				`<text x="${x + cardWidth / 2}" y="${y + cardHeight + 28}" text-anchor="middle" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="600">${escapeText(card.name)}</text>`,
				card.marketPrice
					? `<text x="${x + cardWidth / 2}" y="${y + cardHeight + 50}" text-anchor="middle" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="16">$${card.marketPrice.toFixed(2)}</text>`
					: "",
				`</g>`,
			].join("");
		})
		.join("");

	const totalsLine = formatTotalsLine(input);
	const tagline = input.tagline ?? "Notion-native One Piece card vault";
	const collectionTitle = input.collectionTitle ?? `${input.ownerName}'s Vault`;

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		`<defs>`,
		`<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">`,
		`<stop offset="0%" stop-color="${escapeAttr(background)}" />`,
		`<stop offset="100%" stop-color="${escapeAttr(darken(background))}" />`,
		`</linearGradient>`,
		`</defs>`,
		`<rect width="${width}" height="${height}" fill="url(#bg)" />`,
		`<rect x="${padding - 14}" y="${padding - 14}" width="6" height="${height - padding * 2 + 28}" fill="${escapeAttr(accent)}" />`,
		`<text x="${padding}" y="${headerY}" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="0.15em">GRAND LINE VAULT</text>`,
		`<text x="${padding}" y="${headerY + 56}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="48" font-weight="800">${escapeText(collectionTitle)}</text>`,
		totalsLine
			? `<text x="${padding}" y="${headerY + 96}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="22" opacity="0.7">${escapeText(totalsLine)}</text>`
			: "",
		cardsSvg,
		`<text x="${padding}" y="${height - 64}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="18" opacity="0.6">${escapeText(tagline)}</text>`,
		`<text x="${padding}" y="${height - 36}" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="600">${escapeText(input.notionPublicUrl)}</text>`,
		`</svg>`,
	].join("");
}

export function formatTotalsLine(input: ShareCollectionGraphicInput): string {
	const parts: string[] = [];
	if (typeof input.totalCards === "number") {
		parts.push(`${input.totalCards.toLocaleString("en-US")} cards`);
	}
	if (typeof input.totalMarketValue === "number" && input.totalMarketValue > 0) {
		parts.push(
			`$${input.totalMarketValue.toLocaleString("en-US", {
				maximumFractionDigits: 0,
			})} portfolio`,
		);
	}
	const date = (input.generatedAt ?? new Date()).toISOString().slice(0, 10);
	parts.push(`as of ${date}`);
	return parts.join(" · ");
}

export function svgDataUrl(svg: string): string {
	const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
	return `data:image/svg+xml;charset=utf-8,${encoded}`;
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
