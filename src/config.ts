export const config = {
	ownedCardsDatabaseId: process.env.OWNED_CARDS_DATABASE_ID,
	wishlistsDatabaseId: process.env.WISHLISTS_DATABASE_ID,
	giblApiKey: process.env.GIBL_API_KEY,
	giblGameType: process.env.GIBL_GAME_TYPE ?? "one-piece",
	catalogFeedUrl: process.env.CATALOG_FEED_URL,
	priceFeedUrl: process.env.PRICE_FEED_URL,
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
