export type PostaChannel = "pec" | "email";

export type ChannelMailConfig = {
  configured: boolean;
  fromAddress: string | null;
  fromName: string;
  smtpHost: string | null;
  providerLabel: string;
};

export function getPecFromAddress() {
  return (
    process.env.PEC_FROM_ADDRESS?.trim() ||
    process.env.PEC_SMTP_USERNAME?.trim() ||
    ""
  );
}

export function getPecFromName() {
  return process.env.PEC_FROM_NAME?.trim() || "Coresuite";
}

export function getPecChannelConfig(): ChannelMailConfig {
  const host = process.env.PEC_SMTP_HOST?.trim() || null;
  const user = process.env.PEC_SMTP_USERNAME?.trim();
  const pass = process.env.PEC_SMTP_PASSWORD?.trim();
  return {
    configured: Boolean(host && user && pass),
    fromAddress: getPecFromAddress() || null,
    fromName: getPecFromName(),
    smtpHost: host,
    providerLabel: "PEC certificata",
  };
}

export function getEmailChannelConfig(): ChannelMailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.MAIL_FROM_ADDRESS?.trim() || null;
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Coresuite";
  return {
    configured: Boolean(apiKey && fromAddress),
    fromAddress,
    fromName,
    smtpHost: "smtp.resend.com",
    providerLabel: "Email",
  };
}

export function getChannelMailConfig(channel: PostaChannel): ChannelMailConfig {
  return channel === "pec" ? getPecChannelConfig() : getEmailChannelConfig();
}

export function isChannelMailConfigured(channel: PostaChannel): boolean {
  return getChannelMailConfig(channel).configured;
}

/** @deprecated use isChannelMailConfigured("pec") */
export function isPecSmtpConfigured(): boolean {
  return getPecChannelConfig().configured;
}

export function getPostaMailConfigSummary() {
  const pec = getPecChannelConfig();
  return {
    smtpHost: pec.smtpHost,
    fromAddress: pec.fromAddress,
    fromName: pec.fromName,
    imapEnabled: process.env.PEC_SYNC_ENABLED === "true",
  };
}

export function getPostaTelematicaChannelStatus() {
  const pec = getPecChannelConfig();
  const email = getEmailChannelConfig();
  return {
    pec,
    email,
    smtpConfigured: pec.configured,
    imapConfigured: Boolean(process.env.PEC_IMAP_HOST?.trim() && process.env.PEC_SYNC_ENABLED === "true"),
    syncEnabled: process.env.PEC_SYNC_ENABLED === "true",
    fromAddress: pec.fromAddress,
    fromName: pec.fromName,
    smtpHost: pec.smtpHost,
  };
}
