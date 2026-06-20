export type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

export type GmailPayload = GmailPart & {
  headers?: Array<{ name?: string; value?: string }>;
};

function findPart(payload: GmailPart | undefined, mimeType: string): GmailPart | undefined {
  if (!payload) return undefined;
  if (payload.mimeType === mimeType && payload.body?.data) return payload;

  for (const part of payload.parts ?? []) {
    const found = findPart(part, mimeType);
    if (found) return found;
  }

  return undefined;
}

export function getMessageBody(payload: GmailPayload | undefined): string {
  if (!payload) return "(No body)";

  const bodyData =
    payload.body?.data ??
    findPart(payload, "text/html")?.body?.data ??
    findPart(payload, "text/plain")?.body?.data;

  if (!bodyData) return "(No readable body found)";

  try {
    const base64 = bodyData.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(escape(window.atob(base64)));
  } catch {
    return "(Error decoding message body)";
  }
}

export function isHtmlEmail(body: string): boolean {
  return /<(?:!doctype|html|body|div|p|table|span|br|a)\b/i.test(body);
}
