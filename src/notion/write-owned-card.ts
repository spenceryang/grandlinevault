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
	setCode: string | null;
	setName: string | null;
	rarity: string | null;
	color: string | null;
	cardType: string | null;
	marketPrice: number | null;
};

export async function createOwnedCardPage(
	notion: Client,
	input: AddOwnedCardInput,
): Promise<{ pageId: string; url?: string }> {
	const dataSourceId = requireEnv(
		config.ownedCardsDataSourceId,
		"OWNED_CARDS_DATA_SOURCE_ID",
	);

	const result = await notion.pages.create({
		parent: { data_source_id: dataSourceId },
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
			"Set Code": textProperty(input.setCode),
			"Set Name": textProperty(input.setName),
			Rarity: textProperty(input.rarity),
			Color: textProperty(input.color),
			"Card Type": textProperty(input.cardType),
			"Market Price": {
				number: input.marketPrice,
			},
		},
	});

	return {
		pageId: result.id,
		url: "url" in result ? result.url : undefined,
	};
}

function textProperty(value: string | null) {
	return value
		? {
				rich_text: [
					{
						text: {
							content: value,
						},
					},
				],
			}
		: { rich_text: [] };
}
