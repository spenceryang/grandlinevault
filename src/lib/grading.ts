import type { PreGradeEstimate } from "../types.js";

export type ConditionSignals = {
	frontCenteringRatio?: number;
	backCenteringRatio?: number;
	cornerWearCount?: number;
	edgeWhiteningCount?: number;
	surfaceIssueCount?: number;
	hasGlare?: boolean;
};

export function estimatePreGrade(signals: ConditionSignals): PreGradeEstimate {
	const reasons: string[] = [];
	let score = 10;
	let confidence: PreGradeEstimate["confidence"] = "High";

	if (signals.frontCenteringRatio !== undefined) {
		if (signals.frontCenteringRatio > 0.6) {
			score -= 2;
			reasons.push("front centering appears outside a mint-friendly range");
		} else if (signals.frontCenteringRatio > 0.55) {
			score -= 1;
			reasons.push("front centering appears slightly off");
		}
	} else {
		confidence = "Medium";
		reasons.push("front centering was not measured");
	}

	if ((signals.cornerWearCount ?? 0) > 0) {
		score -= Math.min(signals.cornerWearCount ?? 0, 2);
		reasons.push("visible corner wear detected");
	}

	if ((signals.edgeWhiteningCount ?? 0) > 0) {
		score -= Math.min(signals.edgeWhiteningCount ?? 0, 2);
		reasons.push("edge whitening detected");
	}

	if ((signals.surfaceIssueCount ?? 0) > 0) {
		score -= Math.min(signals.surfaceIssueCount ?? 0, 2);
		reasons.push("surface issues detected");
	}

	if (signals.hasGlare) {
		confidence = "Low";
		reasons.push("glare reduces confidence in surface assessment");
	}

	const bounded = Math.max(1, Math.min(10, score));
	const low = Math.max(1, bounded - 1);

	return {
		rangeLabel: `Likely PSA ${low}–${bounded}`,
		confidence,
		reasons: reasons.length > 0 ? reasons : ["no obvious issues detected"],
	};
}
