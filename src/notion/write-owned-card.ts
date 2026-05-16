import type { Client } from "@notionhq/client";
import { config, requireEnv } from "../config.js";

type AddOwnedCardInput = {
	ownerName: string;
	cardId: string;
	cardName: string;
	quantity: number;
	condition: string | null;
	preGradeEstimate: string | null;
	imageUrl: string | null;
};

export async function createOwnedCardPage(
	notion: Client,
	input: AddOwnedCardInput,
): Promise<{ pageId: string }> {
	const databaseId = requireEnv(
		config.ownedCardsDatabaseId,
		"OWNED_CARDS_DATABASE_ID",
	);

	const result = await notion.pages.create({
		parent: { database_id: databaseId },
		properties: {
			Name: {
				title: [
					{
						text: {
							content: `${input.cardName} · ${input.ownerName}`,
						},
					},
				],
			},
			Owner: {
				rich_text: [
					{
						text: {
							content: input.ownerName,
						},
					},
				],
			},
			"Card ID": {
				rich_text: [
					{
						text: {
							content: input.cardId,
						},
					},
				],
			},
			Quantity: {
				number: input.quantity,
			},
			Condition: input.condition
				? {
						rich_text: [
							{
								text: {
									content: input.condition,
								},
							},
						],
					}
				: { rich_text: [] },
			"Pre-grade estimate": input.preGradeEstimate
				? {
						rich_text: [
							{
								text: {
									content: input.preGradeEstimate,
								},
							},
						],
					}
				: { rich_text: [] },
			"Scan image": input.imageUrl
				? {
						files: [
							{
								name: "scan",
								external: {
									url: input.imageUrl,
								},
							},
						],
					}
				: { files: [] },
		},
	});

	return { pageId: result.id };
}
