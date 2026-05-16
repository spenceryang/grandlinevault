import type { PokemonMasterSetEntry } from "./pokemon-character-master-set.js";

export type CharacterMasterSetShareInput = {
	character: string;
	totalCards: number;
	ownedCards: number;
	notionPublicUrl: string;
	collectorName?: string | null;
	highlightCards?: ReadonlyArray<PokemonMasterSetEntry>;
	generatedAt?: Date;
	tagline?: string | null;
};

export type CharacterMasterSetShareOptions = {
	width?: number;
	height?: number;
	background?: string;
	accent?: string;
	textColor?: string;
	maxHighlightCards?: number;
};

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const DEFAULT_BACKGROUND = "#0c0e16";
const DEFAULT_ACCENT = "#ffb547";
const DEFAULT_TEXT = "#f4f4f5";
const DEFAULT_MAX_HIGHLIGHTS = 5;

export const CHARACTER_ACCENTS: Record<string, string> = {
	Charizard: "#ff7547",
	Gengar: "#9b59ff",
	Pikachu: "#ffd23f",
	Togekiss: "#f7b1d0",
};

export function buildCharacterMasterSetSvg(
	input: CharacterMasterSetShareInput,
	options: CharacterMasterSetShareOptions = {},
): string {
	const width = options.width ?? DEFAULT_WIDTH;
	const height = options.height ?? DEFAULT_HEIGHT;
	const background = options.background ?? DEFAULT_BACKGROUND;
	const accent =
		options.accent ?? CHARACTER_ACCENTS[input.character] ?? DEFAULT_ACCENT;
	const textColor = options.textColor ?? DEFAULT_TEXT;
	const maxHighlights = Math.max(1, options.maxHighlightCards ?? DEFAULT_MAX_HIGHLIGHTS);

	const highlights = (input.highlightCards ?? [])
		.filter((c) => c.owned && c.colorImageUrl)
		.slice(0, maxHighlights);

	const completion =
		input.totalCards === 0 ? 0 : input.ownedCards / input.totalCards;
	const completionPercent = Math.round(completion * 100);
	const padding = 48;
	const headerY = padding + 32;

	const progressBarTop = headerY + 140;
	const progressBarHeight = 36;
	const progressBarWidth = width - padding * 2;
	const progressFillWidth = Math.max(0, progressBarWidth * completion);

	const cardAreaTop = progressBarTop + 84;
	const cardAreaBottom = height - 130;
	const cardAreaHeight = cardAreaBottom - cardAreaTop;
	const cardWidth = highlights.length
		? (width - padding * 2 - (highlights.length - 1) * 20) / highlights.length
		: 0;
	const cardHeight = highlights.length ? Math.min(cardAreaHeight, cardWidth * 1.4) : 0;

	const cardsSvg = highlights
		.map((card, i) => {
			const x = padding + i * (cardWidth + 20);
			const y = cardAreaTop + (cardAreaHeight - cardHeight) / 2;
			return [
				`<g>`,
				`<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="14" fill="${escapeAttr(accent)}" opacity="0.08" />`,
				`<image x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" href="${escapeAttr(card.colorImageUrl ?? "")}" preserveAspectRatio="xMidYMid slice" />`,
				`</g>`,
			].join("");
		})
		.join("");

	const collectorLine = input.collectorName
		? `${escapeText(input.collectorName)}'s `
		: "";
	const generatedAt = (input.generatedAt ?? new Date()).toISOString().slice(0, 10);
	const tagline = input.tagline ?? "Tracked in Grand Line Vault";

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
		`<text x="${padding}" y="${headerY}" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="0.15em">${escapeText(input.character.toUpperCase())} MASTER SET</text>`,
		`<text x="${padding}" y="${headerY + 56}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="800">${collectorLine}${input.ownedCards} of ${input.totalCards}</text>`,
		`<text x="${padding}" y="${headerY + 92}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="22" opacity="0.7">${completionPercent}% complete · ${escapeText(input.character)} printings · as of ${generatedAt}</text>`,
		`<rect x="${padding}" y="${progressBarTop}" width="${progressBarWidth}" height="${progressBarHeight}" rx="${progressBarHeight / 2}" fill="${escapeAttr(textColor)}" opacity="0.1" />`,
		`<rect x="${padding}" y="${progressBarTop}" width="${progressFillWidth}" height="${progressBarHeight}" rx="${progressBarHeight / 2}" fill="${escapeAttr(accent)}" />`,
		cardsSvg,
		`<text x="${padding}" y="${height - 64}" fill="${escapeAttr(textColor)}" font-family="Helvetica, Arial, sans-serif" font-size="18" opacity="0.6">${escapeText(tagline)}</text>`,
		`<text x="${padding}" y="${height - 36}" fill="${escapeAttr(accent)}" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="600">${escapeText(input.notionPublicUrl)}</text>`,
		`</svg>`,
	].join("");
}

export function pickHighlightCards(
	entries: ReadonlyArray<PokemonMasterSetEntry>,
	count: number,
): PokemonMasterSetEntry[] {
	const owned = entries.filter((e) => e.owned && e.colorImageUrl);
	const n = Math.max(1, count);
	if (owned.length <= n) return owned.slice();
	// Evenly distribute selections across the owned cards so highlights span the catalog
	const step = Math.floor(owned.length / n);
	const picks: PokemonMasterSetEntry[] = [];
	for (let i = 0; i < n; i += 1) {
		picks.push(owned[i * step]);
	}
	return picks;
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
