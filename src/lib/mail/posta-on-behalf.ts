export type OnBehalfClient = {
  name: string;
  companyName?: string | null;
  email?: string | null;
};

export function clientDisplayName(client: OnBehalfClient) {
  return client.companyName?.trim() || client.name.trim();
}

export function clientFullLabel(client: OnBehalfClient) {
  if (client.companyName?.trim() && client.companyName.trim() !== client.name.trim()) {
    return `${client.companyName.trim()} (${client.name.trim()})`;
  }
  return clientDisplayName(client);
}

/** Nome visualizzato nel campo From (indirizzo reale resta la casella .env). */
export function buildOnBehalfFromName(orgFromName: string, client: OnBehalfClient) {
  return `${clientDisplayName(client)} (per conto di — ${orgFromName})`;
}

export function buildOnBehalfSubject(subject: string, client: OnBehalfClient) {
  const prefix = `[Per conto di ${clientDisplayName(client)}]`;
  const trimmed = subject.trim();
  if (!trimmed) return prefix;
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return trimmed;
  return `${prefix} ${trimmed}`;
}

const BODY_MARKER = "Messaggio inviato per conto di ";

export function buildOnBehalfBody(body: string, client: OnBehalfClient, orgFromName: string) {
  if (body.trimStart().startsWith(BODY_MARKER)) return body;
  const replyHint = client.email?.trim()
    ? `\nPer le risposte è impostato Reply-To: ${client.email.trim()}.`
    : "";
  return (
    `${BODY_MARKER}${clientFullLabel(client)} tramite ${orgFromName}.${replyHint}\n\n` +
    "─".repeat(48) +
    `\n\n${body.trim()}`
  );
}

export function clientReplyToEmail(client: OnBehalfClient): string | undefined {
  const email = client.email?.trim();
  return email || undefined;
}

export function buildOnBehalfMailContent(options: {
  subject: string;
  body: string;
  client: OnBehalfClient;
  orgFromName: string;
}) {
  const replyTo = clientReplyToEmail(options.client);
  return {
    subject: buildOnBehalfSubject(options.subject, options.client),
    body: buildOnBehalfBody(options.body, options.client, options.orgFromName),
    fromName: buildOnBehalfFromName(options.orgFromName, options.client),
    replyTo,
  };
}

export function formatFromHeader(fromName: string, fromAddress: string) {
  return fromAddress ? `"${fromName}" <${fromAddress}>` : fromName;
}
