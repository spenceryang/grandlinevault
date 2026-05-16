export const config = {
	ownedCardsDataSourceId:
		process.env.OWNED_CARDS_DATA_SOURCE_ID ??
		process.env.OWNED_CARDS_DATABASE_ID,
	wishlistsDataSourceId:
		process.env.WISHLISTS_DATA_SOURCE_ID ?? process.env.WISHLISTS_DATABASE_ID,
	giblApiKey: process.env.GIBL_API_KEY,
	giblGameType: process.env.GIBL_GAME_TYPE ?? "one-piece",
	catalogFeedUrl: process.env.CATALOG_FEED_URL,
	priceFeedUrl: process.env.PRICE_FEED_URL,
	optcgSetIds: parseCsv(
		process.env.OPTCG_SET_IDS ??
			"OP-01,OP-02,OP-03,OP-04,OP-05,OP-06,OP-07,EB-01,OP-08,OP-09,OP-10,OP-11,EB-02,OP-12,PRB-01,PRB-02,OP-13,OP14-EB04,EB-03,OP15-EB04",
	),
	recognitionConfidenceThreshold: Number(
		process.env.RECOGNITION_CONFIDENCE_THRESHOLD ?? "0.82",
	),
};

export function requireEnv(value: string | undefined, name: string): string {
	if (!value) {
		throw new Error(`${name} is required for this operation.`);
	}
	return value;
}

function parseCsv(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}
