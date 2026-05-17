export type BattleCardType = "Leader" | "Character" | "Event" | "Stage" | "DON" | "Unknown";

export type BattleOwnedCard = {
	ownerName: string;
	cardId: string;
	cardName: string;
	quantity: number;
	cardType?: string | null;
	color?: string | null;
	cost?: number | null;
	power?: number | null;
	counter?: number | null;
	rarity?: string | null;
	marketPrice?: number | null;
	setCode?: string | null;
	imageUrl?: string | null;
};

export type BattleDeckCard = BattleOwnedCard & {
	cardTypeNormalized: BattleCardType;
	battleScore: number;
};

export type BattleDeck = {
	deckId: string;
	ownerName: string;
	strategy: BattleDeckStrategy;
	leader: BattleDeckCard;
	mainDeck: BattleDeckCard[];
	colors: string[];
	estimatedStrength: number;
	warnings: string[];
};

export type BattleDeckStrategy =
	| "strongest"
	| "animal-kingdom"
	| "straw-hat"
	| "worst-generation"
	| "balanced";

export type BuildBattleDeckOptions = {
	strategy?: BattleDeckStrategy;
	now?: Date;
};

export type BattleSimulationOptions = {
	runs?: number;
	seed?: number;
	now?: Date;
};

export type BattleSimulationResult = {
	runId: string;
	playerA: string;
	playerB: string;
	deckA: BattleDeck;
	deckB: BattleDeck;
	simulations: number;
	aWins: number;
	bWins: number;
	draws: number;
	aWinRate: number;
	bWinRate: number;
	winner: string;
	keyFactors: string[];
	sampleNarrative: string[];
	modelVersion: string;
	modelLimitations: string[];
};

export const OP_BATTLE_MODEL_VERSION = "op-battle-lab-v0.1";
export const OP_BATTLE_MAIN_DECK_SIZE = 50;
export const OP_BATTLE_MAX_COPIES = 4;

const RARITY_WEIGHT: Record<string, number> = {
	L: 18,
	SEC: 16,
	SR: 12,
	R: 8,
	UC: 5,
	C: 3,
};

export function buildBattleDeck(
	ownerName: string,
	cards: ReadonlyArray<BattleOwnedCard>,
	options: BuildBattleDeckOptions = {},
): BattleDeck {
	const strategy = options.strategy ?? "strongest";
	const owned = cards
		.filter((card) => sameOwner(card.ownerName, ownerName))
		.filter((card) => card.quantity > 0)
		.map(toBattleDeckCard);

	const leaders = owned.filter((card) => card.cardTypeNormalized === "Leader");
	if (leaders.length === 0) {
		throw new Error(`No Leader cards found for ${ownerName}.`);
	}

	const leader = [...leaders].sort(
		(a, b) =>
			scoreLeader(b, owned, strategy) - scoreLeader(a, owned, strategy) ||
			b.battleScore - a.battleScore ||
			a.cardName.localeCompare(b.cardName),
	)[0];
	const colors = splitColors(leader.color);
	const warnings: string[] = [];
	const mainCandidates = owned.filter((card) =>
		["Character", "Event", "Stage"].includes(card.cardTypeNormalized),
	);
	const legalColorCards = mainCandidates.filter((card) =>
		isColorLegal(card, colors),
	);
	const preferred = rankMainDeckCards(legalColorCards, strategy);
	const mainDeck = expandToMainDeck(preferred);

	if (mainDeck.length < OP_BATTLE_MAIN_DECK_SIZE) {
		const offColorFill = rankMainDeckCards(
			mainCandidates.filter((card) => !isColorLegal(card, colors)),
			strategy,
		);
		mainDeck.push(
			...expandToMainDeck(offColorFill, OP_BATTLE_MAIN_DECK_SIZE - mainDeck.length),
		);
		warnings.push(
			`Only ${mainDeck.length} cards could be assembled cleanly; off-color cards may have been used to reach a legal-ish 50-card deck.`,
		);
	}

	if (mainDeck.length < OP_BATTLE_MAIN_DECK_SIZE) {
		warnings.push(
			`Deck has ${mainDeck.length} main-deck cards; official decks use ${OP_BATTLE_MAIN_DECK_SIZE}.`,
		);
	}

	return {
		deckId: makeDeckId(ownerName, leader.cardId, strategy, options.now),
		ownerName,
		strategy,
		leader,
		mainDeck: mainDeck.slice(0, OP_BATTLE_MAIN_DECK_SIZE),
		colors,
		estimatedStrength: round2(estimateDeckStrength(leader, mainDeck)),
		warnings,
	};
}

export function simulateBattle(
	deckA: BattleDeck,
	deckB: BattleDeck,
	options: BattleSimulationOptions = {},
): BattleSimulationResult {
	const runs = Math.max(1, Math.floor(options.runs ?? 100));
	const rng = mulberry32(options.seed ?? hashString(`${deckA.deckId}:${deckB.deckId}:${runs}`));
	let aWins = 0;
	let bWins = 0;
	let draws = 0;

	for (let i = 0; i < runs; i++) {
		const result = simulateOneGame(deckA, deckB, rng);
		if (result > 0) aWins += 1;
		else if (result < 0) bWins += 1;
		else draws += 1;
	}

	const aWinRate = aWins / runs;
	const bWinRate = bWins / runs;
	const winner =
		aWins === bWins
			? "Draw"
			: aWins > bWins
				? deckA.ownerName
				: deckB.ownerName;

	return {
		runId: makeRunId(deckA.ownerName, deckB.ownerName, options.now),
		playerA: deckA.ownerName,
		playerB: deckB.ownerName,
		deckA,
		deckB,
		simulations: runs,
		aWins,
		bWins,
		draws,
		aWinRate: round4(aWinRate),
		bWinRate: round4(bWinRate),
		winner,
		keyFactors: explainMatchup(deckA, deckB, aWins, bWins),
		sampleNarrative: buildSampleNarrative(deckA, deckB, winner),
		modelVersion: OP_BATTLE_MODEL_VERSION,
		modelLimitations: [
			"Official-rule-informed simulation: 1 Leader, 50-card main deck, DON ramp, life pressure, cost curve, power, counter value, and card-type roles are modeled.",
			"Individual card text is represented heuristically; full deterministic effect timing and replacement effects are not implemented yet.",
			"Results should guide deck comparison and collection decisions, not replace tournament testing.",
		],
	};
}

export function deckListMarkdown(deck: BattleDeck): string {
	const grouped = groupDeckCards(deck.mainDeck);
	return [
		`## ${deck.ownerName} · ${deck.strategy}`,
		`**Leader:** ${deck.leader.cardName} (${deck.leader.cardId})`,
		`**Colors:** ${deck.colors.join(" / ") || "Unknown"}`,
		`**Estimated strength:** ${deck.estimatedStrength}`,
		"",
		"### Main deck",
		...grouped.map(
			(card) =>
				`- ${card.quantity}x ${card.cardName} (${card.cardId}) · ${card.cardTypeNormalized}${card.cost != null ? ` · Cost ${card.cost}` : ""}`,
		),
		deck.warnings.length ? "\n### Warnings" : "",
		...deck.warnings.map((warning) => `- ${warning}`),
	]
		.filter(Boolean)
		.join("\n");
}

export function battleRunMarkdown(result: BattleSimulationResult): string {
	return [
		`# ${result.playerA} vs ${result.playerB}`,
		`**Winner:** ${result.winner}`,
		`**Simulations:** ${result.simulations}`,
		`**${result.playerA} win rate:** ${(result.aWinRate * 100).toFixed(1)}%`,
		`**${result.playerB} win rate:** ${(result.bWinRate * 100).toFixed(1)}%`,
		`**Model:** ${result.modelVersion}`,
		"",
		"## Key factors",
		...result.keyFactors.map((factor) => `- ${factor}`),
		"",
		"## Sample battle narrative",
		...result.sampleNarrative.map((line) => `- ${line}`),
		"",
		"## Model limitations",
		...result.modelLimitations.map((line) => `- ${line}`),
		"",
		deckListMarkdown(result.deckA),
		"",
		deckListMarkdown(result.deckB),
	].join("\n");
}

export function normalizeCardType(value: string | null | undefined): BattleCardType {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "leader") return "Leader";
	if (normalized === "character") return "Character";
	if (normalized === "event") return "Event";
	if (normalized === "stage") return "Stage";
	if (normalized === "don" || normalized === "don!!") return "DON";
	return "Unknown";
}

export function splitColors(value: string | null | undefined): string[] {
	if (!value) return [];
	return value
		.split(/[\s,/]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function toBattleDeckCard(card: BattleOwnedCard): BattleDeckCard {
	const normalized = normalizeCardType(card.cardType);
	const base = {
		...card,
		cardTypeNormalized: normalized,
		battleScore: 0,
	};
	return { ...base, battleScore: scoreCard(base) };
}

function scoreLeader(
	leader: BattleDeckCard,
	owned: ReadonlyArray<BattleDeckCard>,
	strategy: BattleDeckStrategy,
): number {
	const colors = splitColors(leader.color);
	const legalPool = owned.filter(
		(card) =>
			["Character", "Event", "Stage"].includes(card.cardTypeNormalized) &&
			isColorLegal(card, colors),
	);
	const poolDepth = Math.min(legalPool.reduce((sum, card) => sum + card.quantity, 0), 50);
	const strategyBonus = legalPool.filter((card) => matchesStrategy(card, strategy)).length;
	return leader.battleScore + poolDepth * 0.4 + strategyBonus * 1.5;
}

function scoreCard(card: BattleDeckCard): number {
	const rarity = (card.rarity ?? "").toUpperCase();
	const rarityScore = RARITY_WEIGHT[rarity] ?? 4;
	const powerScore = (card.power ?? 0) / 1000;
	const counterScore = (card.counter ?? 0) / 1000;
	const priceScore = Math.log10((card.marketPrice ?? 0) + 1) * 3;
	const cost = card.cost ?? 4;
	const curveScore = cost >= 2 && cost <= 6 ? 4 : cost <= 8 ? 2 : 0;
	const typeScore =
		card.cardTypeNormalized === "Character"
			? 5
			: card.cardTypeNormalized === "Event"
				? 3
				: card.cardTypeNormalized === "Stage"
					? 2
					: card.cardTypeNormalized === "Leader"
						? 8
						: 0;
	return round2(rarityScore + powerScore + counterScore + priceScore + curveScore + typeScore);
}

function rankMainDeckCards(
	cards: ReadonlyArray<BattleDeckCard>,
	strategy: BattleDeckStrategy,
): BattleDeckCard[] {
	return [...cards].sort(
		(a, b) =>
			adjustedScore(b, strategy) - adjustedScore(a, strategy) ||
			(a.cost ?? 99) - (b.cost ?? 99) ||
			a.cardName.localeCompare(b.cardName),
	);
}

function adjustedScore(card: BattleDeckCard, strategy: BattleDeckStrategy): number {
	return card.battleScore + (matchesStrategy(card, strategy) ? 6 : 0);
}

function matchesStrategy(card: BattleDeckCard, strategy: BattleDeckStrategy): boolean {
	const haystack = `${card.cardName} ${card.setCode ?? ""}`.toLowerCase();
	switch (strategy) {
		case "animal-kingdom":
			return /kaido|king|queen|jack|ulti|page one|black maria|sasak|animal|st04/.test(haystack);
		case "straw-hat":
			return /luffy|zoro|sanji|nami|usopp|chopper|robin|franky|brook|jinbe|straw|st01/.test(haystack);
		case "worst-generation":
			return /kid|law|bonney|killer|bege|urouge|apoo|hawkins|x\\.drake|worst|st02/.test(haystack);
		case "balanced":
		case "strongest":
		default:
			return false;
	}
}

function expandToMainDeck(
	cards: ReadonlyArray<BattleDeckCard>,
	limit = OP_BATTLE_MAIN_DECK_SIZE,
): BattleDeckCard[] {
	const deck: BattleDeckCard[] = [];
	for (const card of cards) {
		const copies = Math.min(card.quantity, OP_BATTLE_MAX_COPIES, limit - deck.length);
		for (let i = 0; i < copies; i++) deck.push(card);
		if (deck.length >= limit) break;
	}
	return deck;
}

function isColorLegal(card: BattleDeckCard, leaderColors: string[]): boolean {
	const cardColors = splitColors(card.color);
	if (leaderColors.length === 0 || cardColors.length === 0) return true;
	return cardColors.every((color) => leaderColors.includes(color));
}

function estimateDeckStrength(
	leader: BattleDeckCard,
	mainDeck: ReadonlyArray<BattleDeckCard>,
): number {
	if (mainDeck.length === 0) return leader.battleScore;
	const avgScore = mainDeck.reduce((sum, card) => sum + card.battleScore, 0) / mainDeck.length;
	const curve = curveQuality(mainDeck) * 12;
	const counters = counterDensity(mainDeck) * 8;
	const eventRatio =
		mainDeck.filter((card) => card.cardTypeNormalized === "Event").length / mainDeck.length;
	const eventScore = eventRatio >= 0.1 && eventRatio <= 0.28 ? 4 : 0;
	return leader.battleScore * 1.2 + avgScore * 2.4 + curve + counters + eventScore;
}

function curveQuality(cards: ReadonlyArray<BattleDeckCard>): number {
	if (cards.length === 0) return 0;
	const playable = cards.filter((card) => {
		const cost = card.cost ?? 4;
		return cost >= 1 && cost <= 6;
	}).length;
	return playable / cards.length;
}

function counterDensity(cards: ReadonlyArray<BattleDeckCard>): number {
	if (cards.length === 0) return 0;
	return cards.filter((card) => (card.counter ?? 0) > 0).length / cards.length;
}

function simulateOneGame(
	deckA: BattleDeck,
	deckB: BattleDeck,
	rng: () => number,
): number {
	const aBase = deckA.estimatedStrength;
	const bBase = deckB.estimatedStrength;
	let aTempo = 0;
	let bTempo = 0;
	for (let turn = 1; turn <= 8; turn++) {
		aTempo += turnSwing(deckA, turn, rng);
		bTempo += turnSwing(deckB, turn, rng);
	}
	const goingFirstPenalty = 1.5;
	const aScore = aBase + aTempo - goingFirstPenalty + gaussianish(rng) * 8;
	const bScore = bBase + bTempo + gaussianish(rng) * 8;
	const delta = aScore - bScore;
	if (Math.abs(delta) < 1.25) return 0;
	return delta > 0 ? 1 : -1;
}

function turnSwing(deck: BattleDeck, turn: number, rng: () => number): number {
	const don = Math.min(turn * 2, 10);
	const playable = deck.mainDeck.filter((card) => (card.cost ?? 4) <= don);
	if (playable.length === 0) return 0;
	const sampled = playable[Math.floor(rng() * playable.length)];
	const typeMultiplier =
		sampled.cardTypeNormalized === "Character"
			? 1
			: sampled.cardTypeNormalized === "Event"
				? 0.75
				: 0.5;
	return sampled.battleScore * typeMultiplier * (0.3 + rng() * 0.25);
}

function explainMatchup(
	deckA: BattleDeck,
	deckB: BattleDeck,
	aWins: number,
	bWins: number,
): string[] {
	const leader =
		aWins >= bWins
			? `${deckA.ownerName}'s ${deckA.leader.cardName}`
			: `${deckB.ownerName}'s ${deckB.leader.cardName}`;
	const stronger =
		deckA.estimatedStrength >= deckB.estimatedStrength ? deckA : deckB;
	const faster =
		curveQuality(deckA.mainDeck) >= curveQuality(deckB.mainDeck) ? deckA : deckB;
	return [
		`${leader} was the better simulated leader shell in this matchup.`,
		`${stronger.ownerName} had the higher estimated deck strength (${stronger.estimatedStrength}).`,
		`${faster.ownerName} had the smoother early DON curve, which improves tempo in the simplified model.`,
		"Counter density and event ratio are included, but individual card text is still heuristic.",
	];
}

function buildSampleNarrative(deckA: BattleDeck, deckB: BattleDeck, winner: string): string[] {
	const aTop = groupDeckCards(deckA.mainDeck).slice(0, 2).map((card) => card.cardName);
	const bTop = groupDeckCards(deckB.mainDeck).slice(0, 2).map((card) => card.cardName);
	return [
		`${deckA.ownerName} leads with ${deckA.leader.cardName}; ${deckB.ownerName} answers with ${deckB.leader.cardName}.`,
		`${deckA.ownerName}'s pressure cards were ${aTop.join(" and ") || "not established"}.`,
		`${deckB.ownerName}'s key cards were ${bTop.join(" and ") || "not established"}.`,
		winner === "Draw"
			? "The simulated matchup landed close enough to call it a draw band."
			: `${winner} converted the better curve and pressure profile into the higher Monte Carlo win rate.`,
	];
}

function groupDeckCards(cards: ReadonlyArray<BattleDeckCard>): BattleDeckCard[] {
	const grouped = new Map<string, BattleDeckCard>();
	for (const card of cards) {
		const existing = grouped.get(card.cardId);
		if (existing) existing.quantity += 1;
		else grouped.set(card.cardId, { ...card, quantity: 1 });
	}
	return [...grouped.values()].sort(
		(a, b) => b.quantity - a.quantity || b.battleScore - a.battleScore,
	);
}

function sameOwner(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function makeDeckId(
	ownerName: string,
	leaderCardId: string,
	strategy: string,
	now = new Date(),
): string {
	return `${slug(ownerName)}:${leaderCardId}:${strategy}:${now.toISOString().slice(0, 10)}`;
}

function makeRunId(playerA: string, playerB: string, now = new Date()): string {
	return `${slug(playerA)}-vs-${slug(playerB)}:${now.toISOString()}`;
}

function slug(value: string): string {
	return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function round4(value: number): number {
	return Math.round(value * 10_000) / 10_000;
}

function hashString(value: string): number {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function mulberry32(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function gaussianish(rng: () => number): number {
	return rng() + rng() + rng() + rng() - 2;
}
