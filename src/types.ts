export type CardColor =
	| "Red"
	| "Green"
	| "Blue"
	| "Purple"
	| "Black"
	| "Yellow"
	| "Multicolor"
	| "Unknown";

export type CardType = "Leader" | "Character" | "Stage" | "Event" | "Unknown";

export type EnglishCard = {
	cardId: string;
	name: string;
	setCode: string;
	setName: string;
	variant: string;
	rarity: string;
	color: CardColor;
	cardType: CardType;
	cost?: number;
	power?: number;
	counter?: number;
	effectText?: string;
	imageUrl?: string;
	sourceUrl?: string;
	englishAvailable: true;
	updatedAt?: string;
};

export type RecognitionCandidate = {
	cardId: string;
	name: string;
	confidence: number;
	language: "English" | "Japanese" | "Chinese" | "Unknown";
	imageUrl?: string;
};

export type RecognitionResult =
	| {
			status: "matched";
			candidate: RecognitionCandidate;
	  }
	| {
			status: "needs_review";
			reason: string;
			candidates: RecognitionCandidate[];
	  }
	| {
			status: "rejected";
			reason: string;
			candidates: RecognitionCandidate[];
	  };

export type PriceSnapshot = {
	cardId: string;
	marketPrice: number;
	lowPrice?: number;
	currency: string;
	source: string;
	capturedAt: string;
};

export type PreGradeEstimate = {
	rangeLabel: string;
	confidence: "Low" | "Medium" | "High";
	reasons: string[];
};
