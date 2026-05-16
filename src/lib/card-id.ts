export function normalizeCardId(input: string): string {
	return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function inferSetCode(cardId: string): string {
	const normalized = normalizeCardId(cardId);
	const match = normalized.match(/^([A-Z]+-?\d{2})/);
	return match?.[1].replace("-", "") ?? "UNKNOWN";
}

export function isSupportedMainSet(setCode: string): boolean {
	const match = setCode.match(/^OP(\d{2})$/);
	if (!match) {
		return false;
	}
	const value = Number(match[1]);
	return value >= 1 && value <= 15;
}
