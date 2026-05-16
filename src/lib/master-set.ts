export type MasterSetVariantKind = "base" | "parallel" | "alt-art" | "promo";

export type MasterSetEntry = {
	variantId: string;
	baseCardId: string;
	name: string;
	setId: string | null;
	setName: string | null;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	variant: MasterSetVariantKind;
	imageUrl: string;
};

export type MasterSetSourceCard = {
	card_set_id: string;
	card_image_id: string;
	card_name: string;
	set_id: string | null;
	set_name: string | null;
	rarity: string | null;
	card_color: string | null;
	card_type: string | null;
	card_image: string;
};

export function classifyMasterSetVariant(
	imageId: string,
	baseId: string,
): MasterSetVariantKind {
	const suffix = imageId.replace(baseId, "");
	if (suffix === "") return "base";
	if (/^_p\d+$/i.test(suffix)) return "parallel";
	if (/_alt/i.test(suffix)) return "alt-art";
	return "promo";
}

export function buildMasterSetEntries(
	rawCards: ReadonlyArray<MasterSetSourceCard>,
): MasterSetEntry[] {
	return rawCards.map((c) => ({
		variantId: c.card_image_id,
		baseCardId: c.card_set_id,
		name: c.card_name,
		setId: c.set_id,
		setName: c.set_name,
		rarity: c.rarity,
		color: c.card_color,
		cardType: c.card_type,
		variant: classifyMasterSetVariant(c.card_image_id, c.card_set_id),
		imageUrl: c.card_image,
	}));
}

export type MasterSetCompletion = {
	total: number;
	ownedTotal: number;
	baseTotal: number;
	baseOwned: number;
	parallelTotal: number;
	parallelOwned: number;
	completionPercent: number;
};

export function summarizeMasterSetCompletion(
	entries: ReadonlyArray<MasterSetEntry & { owned: boolean }>,
): MasterSetCompletion {
	const total = entries.length;
	const ownedTotal = entries.filter((e) => e.owned).length;
	const base = entries.filter((e) => e.variant === "base");
	const parallel = entries.filter((e) => e.variant === "parallel");
	return {
		total,
		ownedTotal,
		baseTotal: base.length,
		baseOwned: base.filter((e) => e.owned).length,
		parallelTotal: parallel.length,
		parallelOwned: parallel.filter((e) => e.owned).length,
		completionPercent:
			total === 0 ? 0 : Math.round((ownedTotal / total) * 10000) / 100,
	};
}
