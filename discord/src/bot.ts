import { Client, Events, GatewayIntentBits, type Message } from "discord.js";
import { handleIncomingScan } from "./scan-handler.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const SCAN_CHANNEL_ID = process.env.DISCORD_SCAN_CHANNEL_ID;

if (!TOKEN) {
	throw new Error("DISCORD_BOT_TOKEN is required.");
}
if (!SCAN_CHANNEL_ID) {
	throw new Error("DISCORD_SCAN_CHANNEL_ID is required.");
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.once(Events.ClientReady, (c) => {
	console.log(`Grand Line Vault Discord bot ready as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message: Message) => {
	if (message.channelId !== SCAN_CHANNEL_ID) return;
	if (message.author.bot) return;
	if (message.attachments.size === 0) return;

	const imageAttachments = message.attachments.filter((a) =>
		(a.contentType ?? "").toLowerCase().startsWith("image/"),
	);
	if (imageAttachments.size === 0) {
		await message.reply(
			"Attach a card image (JPEG/PNG/WebP) and I'll add it to your Scan Inbox.",
		);
		return;
	}

	await message.reply(
		`Queueing ${imageAttachments.size} card photo(s) to the Scan Inbox…`,
	);

	const ownerName = `${message.author.username} (Discord: ${message.author.id})`;
	const results: string[] = [];
	for (const att of imageAttachments.values()) {
		try {
			await handleIncomingScan({
				ownerName,
				imageUrl: att.url,
				contentType: att.contentType ?? "image/jpeg",
				filename: att.name,
				sourceMessageUrl: message.url,
			});
			results.push(`✅ ${att.name}`);
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			results.push(`⚠️ ${att.name}: ${detail}`);
		}
	}

	await message.reply(results.join("\n"));
});

await client.login(TOKEN);
