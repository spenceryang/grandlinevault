import { Client } from "@notionhq/client";

const notion = process.env.NOTION_API_TOKEN
	? new Client({ auth: process.env.NOTION_API_TOKEN })
	: null;

const SCAN_INBOX_DATA_SOURCE_ID = process.env.SCAN_INBOX_DATA_SOURCE_ID;

export type IncomingScan = {
	submittedBy: string;
	imageUrl: string;
	contentType: string;
	filename: string;
	sourceMessageUrl: string;
};

export async function handleIncomingScan(input: IncomingScan): Promise<void> {
	if (!notion) {
		throw new Error("NOTION_API_TOKEN is required.");
	}
	if (!SCAN_INBOX_DATA_SOURCE_ID) {
		throw new Error("SCAN_INBOX_DATA_SOURCE_ID is required.");
	}

	// Create a Scan Inbox row pointing at the Discord-hosted image URL.
	// The existing `processScanInboxQueue` worker tool will pick it up
	// on its next pass — recognize the card, enrich from OPTCG, and
	// create the Owned Card record.
	await notion.pages.create({
		parent: { type: "data_source_id", data_source_id: SCAN_INBOX_DATA_SOURCE_ID },
		properties: {
			Name: {
				title: [
					{
						text: { content: `${input.filename} via Discord` },
					},
				],
			},
			"Submitted By": {
				rich_text: [{ text: { content: input.submittedBy } }],
			},
			"Front image": {
				files: [
					{
						type: "external",
						name: input.filename,
						external: { url: input.imageUrl },
					},
				],
			},
			Status: { select: { name: "New" } },
			Source: {
				rich_text: [{ text: { content: `Discord: ${input.sourceMessageUrl}` } }],
			},
		},
	} as Parameters<typeof notion.pages.create>[0]);
}
