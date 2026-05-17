import type { Client } from "@notionhq/client";
import { config, requireEnv } from "../config.js";
import {
	battleRunMarkdown,
	deckListMarkdown,
	OP_BATTLE_MODEL_VERSION,
	type BattleDeck,
	type BattleSimulationResult,
} from "../lib/op-battle.js";

export async function createBattleDeckPage(
	notion: Client,
	deck: BattleDeck,
): Promise<{ pageId: string; url?: string }> {
	const dataSourceId = requireEnv(
		config.battleDecksDataSourceId,
		"BATTLE_DECKS_DATA_SOURCE_ID",
	);
	const result = await notion.pages.create({
		parent: { data_source_id: dataSourceId },
		...(deck.leader.imageUrl
			? { cover: { type: "external" as const, external: { url: deck.leader.imageUrl } } }
			: {}),
		properties: {
			Name: title(`${deck.ownerName} · ${deck.leader.cardName} · ${deck.strategy}`),
			"Deck ID": richText(deck.deckId),
			Owner: richText(deck.ownerName),
			Status: status("In progress"),
			Strategy: select(deck.strategy),
			"Leader Name": richText(deck.leader.cardName),
			"Leader Card ID": richText(deck.leader.cardId),
			Colors: richText(deck.colors.join(" / ")),
			"Main Deck Count": number(deck.mainDeck.length),
			"Estimated Strength": number(deck.estimatedStrength),
			"Model Version": richText(OP_BATTLE_MODEL_VERSION),
			"Created At": date(new Date()),
		},
		children: markdownChildren(deckListMarkdown(deck)),
	});
	return { pageId: result.id, url: "url" in result ? result.url : undefined };
}

export async function createBattleRunPage(
	notion: Client,
	result: BattleSimulationResult,
	deckAUrl?: string,
	deckBUrl?: string,
): Promise<{ pageId: string; url?: string }> {
	const dataSourceId = requireEnv(
		config.battleRunsDataSourceId,
		"BATTLE_RUNS_DATA_SOURCE_ID",
	);
	const page = await notion.pages.create({
		parent: { data_source_id: dataSourceId },
		properties: {
			Name: title(`${result.playerA} vs ${result.playerB}`),
			"Run ID": richText(result.runId),
			Status: status("In progress"),
			Winner: richText(result.winner),
			"Player A": richText(result.playerA),
			"Player B": richText(result.playerB),
			"Deck A ID": richText(result.deckA.deckId),
			"Deck B ID": richText(result.deckB.deckId),
			Simulations: number(result.simulations),
			"A Wins": number(result.aWins),
			"B Wins": number(result.bWins),
			Draws: number(result.draws),
			"A Win Rate": number(result.aWinRate),
			"B Win Rate": number(result.bWinRate),
			"Model Version": richText(result.modelVersion),
			"Created At": date(new Date()),
		},
		children: markdownChildren(
			[
				battleRunMarkdown(result),
				deckAUrl ? `\nDeck A page: ${deckAUrl}` : "",
				deckBUrl ? `\nDeck B page: ${deckBUrl}` : "",
			].join("\n"),
		),
	});
	return { pageId: page.id, url: "url" in page ? page.url : undefined };
}

function title(content: string) {
	return { title: [{ text: { content: content.slice(0, 2000) } }] };
}

function richText(content: string) {
	return { rich_text: [{ text: { content: content.slice(0, 2000) } }] };
}

function number(value: number) {
	return { number: value };
}

function select(name: string) {
	return { select: { name } };
}

function status(name: string) {
	return { status: { name } };
}

function date(value: Date) {
	return { date: { start: value.toISOString() } };
}

function markdownChildren(markdown: string) {
	const chunks = markdown.match(/[\s\S]{1,1800}/g) ?? [];
	return chunks.slice(0, 90).map((content) => ({
		object: "block" as const,
		type: "paragraph" as const,
		paragraph: {
			rich_text: [{ type: "text" as const, text: { content } }],
		},
	}));
}
