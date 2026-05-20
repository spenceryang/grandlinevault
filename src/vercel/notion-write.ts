import type { NotionDataSource } from "./notion-http.js";
import type { PokemonCardSearchResult } from "./pokemon.js";

type PropertySchema = NonNullable<NotionDataSource["properties"]>[string];

export function buildPokemonOwnedCardProperties(input: {
	dataSource: NotionDataSource;
	card: PokemonCardSearchResult;
	owner: string;
	quantity: number;
}): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	const schemas = input.dataSource.properties ?? {};

	setProperty(properties, schemas, "Name", input.card.name);
	setProperty(properties, schemas, "Owner", input.owner);
	setProperty(properties, schemas, "Card ID", input.card.id);
	setProperty(properties, schemas, "Game", "Pokemon");
	setProperty(properties, schemas, "Set", input.card.setName ?? input.card.setId ?? "Unknown");
	setProperty(properties, schemas, "Set Name", input.card.setName ?? input.card.setId ?? "Unknown");
	setProperty(properties, schemas, "Rarity", input.card.rarity ?? "Unknown");
	setProperty(properties, schemas, "Color", input.card.types);
	setProperty(properties, schemas, "Type", input.card.types.join(", ") || "Pokemon");
	setProperty(properties, schemas, "Quantity", input.quantity);
	setProperty(properties, schemas, "Notes", pokemonNotes(input.card));

	if (input.card.imageUrl) {
		setFileProperty(properties, schemas, "Card Image", input.card.name, input.card.imageUrl);
		setFileProperty(properties, schemas, "Image", input.card.name, input.card.imageUrl);
	}

	return properties;
}

function setProperty(
	properties: Record<string, unknown>,
	schemas: Record<string, PropertySchema>,
	name: string,
	value: string | number | string[],
) {
	const schema = schemas[name];
	if (!schema) return;

	switch (schema.type) {
		case "title":
			properties[name] = { title: rich(String(value)) };
			break;
		case "rich_text":
			properties[name] = { rich_text: rich(Array.isArray(value) ? value.join(", ") : String(value)) };
			break;
		case "select":
			properties[name] = { select: { name: Array.isArray(value) ? value[0] ?? "Unknown" : String(value) } };
			break;
		case "multi_select":
			properties[name] = {
				multi_select: (Array.isArray(value) ? value : [String(value)]).filter(Boolean).map((item) => ({ name: item })),
			};
			break;
		case "number":
			if (typeof value === "number") properties[name] = { number: value };
			break;
	}
}

function setFileProperty(
	properties: Record<string, unknown>,
	schemas: Record<string, PropertySchema>,
	name: string,
	fileName: string,
	url: string,
) {
	if (schemas[name]?.type !== "files") return;
	properties[name] = {
		files: [{ type: "external", name: fileName, external: { url } }],
	};
}

function rich(content: string) {
	return [{ type: "text", text: { content: content.slice(0, 1900) } }];
}

function pokemonNotes(card: PokemonCardSearchResult): string {
	return [
		"Imported from the Vercel UI via TCGdex.",
		card.hp ? `HP: ${card.hp}` : null,
		card.types.length ? `Types: ${card.types.join(", ")}` : null,
	]
		.filter(Boolean)
		.join(" ");
}

