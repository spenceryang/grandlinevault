export type ResendInboundEventType =
	| "email.inbound.delivered"
	| "email.inbound.bounced"
	| "email.inbound.complained";

export type ResendInboundAttachment = {
	filename: string;
	contentType: string;
	size: number;
	content: string; // base64-encoded bytes
	contentId?: string | null;
	disposition?: "attachment" | "inline" | null;
};

export type ResendInboundHeader = {
	name: string;
	value: string;
};

export type ResendInboundEmail = {
	id: string;
	from: string;
	to: string[];
	cc?: string[] | null;
	bcc?: string[] | null;
	subject: string | null;
	text: string | null;
	html: string | null;
	headers: ResendInboundHeader[];
	attachments: ResendInboundAttachment[];
	receivedAt: string;
};

export type ResendInboundWebhookPayload = {
	type: ResendInboundEventType;
	created_at: string;
	data: ResendInboundEmail;
};

export type ResendWebhookHeaders = {
	"svix-id": string;
	"svix-timestamp": string;
	"svix-signature": string;
};

export type ParsedAttachment = {
	filename: string;
	contentType: string;
	bytes: Buffer;
	sizeBytes: number;
};

export type ParsedInboundScan = {
	messageId: string;
	from: string;
	to: string[];
	subject: string | null;
	receivedAt: string;
	imageAttachments: ParsedAttachment[];
};
