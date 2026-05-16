export type DecklistSlot =
	| "Leader"
	| "Character"
	| "Event"
	| "Stage"
	| "DON";

export type DecklistEntry = {
	cardSetId: string;
	cardImageId?: string;
	name: string;
	slot: DecklistSlot;
	quantity: number;
	color?: string;
	cost?: number | null;
	marketPrice?: number | null;
};

export type DeckColorRow = {
	color: string;
	count: number;
};

export type CostCurveRow = {
	cost: number;
	count: number;
};

export type DeckStats = {
	leaderCount: number;
	mainDeckCount: number;
	donCount: number;
	totalCards: number;
	uniqueCards: number;
	estimatedValue: number;
	colorBreakdown: DeckColorRow[];
	costCurve: CostCurveRow[];
};

export type DeckValidationResult = {
	valid: boolean;
	errors: string[];
	warnings: string[];
	stats: DeckStats;
};

export const OPTCG_MAIN_DECK_SIZE = 50;
export const OPTCG_LEADER_COUNT = 1;
export const OPTCG_DON_COUNT = 10;
export const OPTCG_MAX_COPIES_PER_CARD = 4;

export function summarizeDecklist(
	entries: ReadonlyArray<DecklistEntry>,
): DeckStats {
	const leaderCount = entries
		.filter((e) => e.slot === "Leader")
		.reduce((s, e) => s + e.quantity, 0);
	const mainEntries = entries.filter(
		(e) => e.slot === "Character" || e.slot === "Event" || e.slot === "Stage",
	);
	const mainDeckCount = mainEntries.reduce((s, e) => s + e.quantity, 0);
	const donCount = entries
		.filter((e) => e.slot === "DON")
		.reduce((s, e) => s + e.quantity, 0);
	const totalCards = entries.reduce((s, e) => s + e.quantity, 0);
	const uniqueCards = entries.length;
	const estimatedValue = round2(
		entries.reduce(
			(s, e) => s + (e.marketPrice ?? 0) * e.quantity,
			0,
		),
	);

	const colorMap = new Map<string, number>();
	for (const e of entries) {
		const color = e.color ?? "Unknown";
		colorMap.set(color, (colorMap.get(color) ?? 0) + e.quantity);
	}
	const colorBreakdown = Array.from(colorMap.entries())
		.map(([color, count]) => ({ color, count }))
		.sort((a, b) => b.count - a.count);

	const costMap = new Map<number, number>();
	for (const e of mainEntries) {
		if (typeof e.cost === "number") {
			costMap.set(e.cost, (costMap.get(e.cost) ?? 0) + e.quantity);
		}
	}
	const costCurve = Array.from(costMap.entries())
		.map(([cost, count]) => ({ cost, count }))
		.sort((a, b) => a.cost - b.cost);

	return {
		leaderCount,
		mainDeckCount,
		donCount,
		totalCards,
		uniqueCards,
		estimatedValue,
		colorBreakdown,
		costCurve,
	};
}

export function validateOptcgDecklist(
	entries: ReadonlyArray<DecklistEntry>,
): DeckValidationResult {
	const stats = summarizeDecklist(entries);
	const errors: string[] = [];
	const warnings: string[] = [];

	if (stats.leaderCount !== OPTCG_LEADER_COUNT) {
		errors.push(
			`Deck must include exactly ${OPTCG_LEADER_COUNT} Leader card (found ${stats.leaderCount}).`,
		);
	}
	if (stats.mainDeckCount !== OPTCG_MAIN_DECK_SIZE) {
		errors.push(
			`Main deck must be exactly ${OPTCG_MAIN_DECK_SIZE} cards (found ${stats.mainDeckCount}).`,
		);
	}
	if (stats.donCount !== 0 && stats.donCount !== OPTCG_DON_COUNT) {
		warnings.push(
			`Standard OPTCG decks use ${OPTCG_DON_COUNT} DON!! cards (found ${stats.donCount}).`,
		);
	}

	for (const entry of entries) {
		if (entry.slot === "Leader" || entry.slot === "DON") continue;
		if (entry.quantity > OPTCG_MAX_COPIES_PER_CARD) {
			errors.push(
				`Too many copies of ${entry.name} (${entry.cardSetId}): ${entry.quantity}. OPTCG allows a maximum of ${OPTCG_MAX_COPIES_PER_CARD}.`,
			);
		}
		if (entry.quantity < 1) {
			errors.push(
				`Quantity for ${entry.name} (${entry.cardSetId}) must be at least 1.`,
			);
		}
	}

	const leaderColor = entries.find((e) => e.slot === "Leader")?.color;
	if (leaderColor) {
		const leaderColors = leaderColor.split(/\s+/).map((c) => c.trim());
		const offColor = entries.filter(
			(e) =>
				e.slot !== "Leader" &&
				e.slot !== "DON" &&
				e.color &&
				e.color.split(/\s+/).some((c) => !leaderColors.includes(c.trim())),
		);
		if (offColor.length > 0) {
			warnings.push(
				`${offColor.length} card(s) include a color outside the Leader's color identity (${leaderColors.join(" / ")}).`,
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		stats,
	};
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
