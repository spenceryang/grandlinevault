import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildSlackCardIntakeReply,
	extractSlackCardIntakeInput,
} from "../src/lib/slack-intake.js";
import {
	filenameFromUrl,
	parseSlackOwnerMap,
	resolveSlackOwnerName,
} from "../src/providers/slack.js";

test("parseSlackOwnerMap supports JSON maps", () => {
	assert.deepEqual(parseSlackOwnerMap('{"U1":"Spencer","U2":"Waffle"}'), {
		U1: "Spencer",
		U2: "Waffle",
	});
});

test("parseSlackOwnerMap supports comma maps", () => {
	assert.deepEqual(parseSlackOwnerMap("U1:Spencer,U2:Jarren"), {
		U1: "Spencer",
		U2: "Jarren",
	});
});

test("resolveSlackOwnerName prefers explicit owner", () => {
	assert.equal(
		resolveSlackOwnerName({
			ownerName: "Waffle",
			slackUserId: "U1",
			ownerMap: { U1: "Spencer" },
		}),
		"Waffle",
	);
});

test("resolveSlackOwnerName maps Slack users and falls back", () => {
	assert.equal(
		resolveSlackOwnerName({ slackUserId: "U1", ownerMap: { U1: "Jarren" } }),
		"Jarren",
	);
	assert.equal(resolveSlackOwnerName({ slackUserId: "unknown" }), "Spencer");
});

test("extractSlackCardIntakeInput reads Slack event file payloads", () => {
	assert.deepEqual(
		extractSlackCardIntakeInput({
			event: {
				user: "U123",
				files: [
					{
						url_private_download: "https://files.slack.com/card.jpg",
						name: "card.jpg",
						mimetype: "image/jpeg",
					},
				],
			},
		}),
		{
			imageUrl: "https://files.slack.com/card.jpg",
			filename: "card.jpg",
			ownerName: undefined,
			slackUserId: "U123",
		},
	);
});

test("extractSlackCardIntakeInput returns null without an image", () => {
	assert.equal(extractSlackCardIntakeInput({ event: { files: [] } }), null);
});

test("filenameFromUrl falls back from MIME type", () => {
	assert.equal(filenameFromUrl("not a url", "image/png"), "slack-card-scan.png");
});

test("buildSlackCardIntakeReply includes owned card link on match", () => {
	const reply = buildSlackCardIntakeReply("Spencer", {
		status: "Matched",
		message: "Matched Nami (OP01-016) · OP-01 · R",
		scanInboxUrl: "https://notion.so/scan",
		ownedCardUrl: "https://notion.so/owned",
	});
	assert.match(reply, /Added to Spencer's collection/);
	assert.match(reply, /https:\/\/notion\.so\/owned/);
});
