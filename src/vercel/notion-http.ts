const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

export type NotionPage = {
	id: string;
	url?: string;
	cover?: NotionFileLike | null;
	properties?: Record<string, NotionProperty>;
};

export type NotionProperty = {
	type?: string;
	title?: Array<{ plain_text?: string }>;
	rich_text?: Array<{ plain_text?: string }>;
	select?: { name?: string } | null;
	multi_select?: Array<{ name?: string }>;
	status?: { name?: string } | null;
	number?: number | null;
	checkbox?: boolean;
	url?: string | null;
	files?: NotionFileLike[];
};

export type NotionFileLike = {
	type?: "external" | "file";
	name?: string;
	external?: { url?: string };
	file?: { url?: string };
};

export type NotionDataSource = {
	id: string;
	properties?: Record<string, { type?: string; name?: string }>;
};

export function getOwnedCardsDataSourceId(): string {
	const id =
		process.env.OWNED_CARDS_DATA_SOURCE_ID ??
		process.env.OWNED_CARDS_DATABASE_ID;
	if (!id) {
		throw new Error("OWNED_CARDS_DATA_SOURCE_ID is required.");
	}
	return id;
}

export async function queryNotionDataSource(
	dataSourceId: string,
	options: { pageSize?: number; startCursor?: string } = {},
): Promise<{ results: NotionPage[]; next_cursor: string | null }> {
	return notionRequest<{ results: NotionPage[]; next_cursor: string | null }>(
		`/data_sources/${dataSourceId}/query`,
		{
			method: "POST",
			body: {
				page_size: options.pageSize ?? 100,
				start_cursor: options.startCursor,
				result_type: "page",
			},
		},
	);
}

export async function getNotionDataSource(
	dataSourceId: string,
): Promise<NotionDataSource> {
	return notionRequest<NotionDataSource>(`/data_sources/${dataSourceId}`, {
		method: "GET",
	});
}

export async function createNotionPageInDataSource(input: {
	dataSourceId: string;
	properties: Record<string, unknown>;
	coverUrl?: string | null;
}): Promise<NotionPage> {
	return notionRequest<NotionPage>(`/pages`, {
		method: "POST",
		body: {
			parent: { type: "data_source_id", data_source_id: input.dataSourceId },
			cover: input.coverUrl
				? { type: "external", external: { url: input.coverUrl } }
				: undefined,
			properties: input.properties,
		},
	});
}

export async function notionRequest<T>(
	path: string,
	input: { method: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<T> {
	const token = process.env.NOTION_TOKEN;
	if (!token) {
		throw new Error("NOTION_TOKEN is required for the Vercel UI API.");
	}

	const response = await fetch(`${NOTION_API_BASE}${path}`, {
		method: input.method,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"Notion-Version": NOTION_VERSION,
		},
		body: input.body ? JSON.stringify(removeUndefined(input.body)) : undefined,
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(
			`Notion API request failed with ${response.status}: ${body.slice(0, 500)}`,
		);
	}

	return (await response.json()) as T;
}

function removeUndefined(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(removeUndefined);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.map(([key, entry]) => [key, removeUndefined(entry)]),
	);
}

