import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  getChannelMailConfig,
  isChannelMailConfigured,
  type PostaChannel,
} from "@/lib/mail/pec-config";

export { isChannelMailConfigured, isPecSmtpConfigured } from "@/lib/mail/pec-config";

function createPecTransport(): Transporter {
  const host = process.env.PEC_SMTP_HOST?.trim();
  const port = Number(process.env.PEC_SMTP_PORT?.trim() || 465);
  const user = process.env.PEC_SMTP_USERNAME?.trim();
  const pass = process.env.PEC_SMTP_PASSWORD?.trim();
  const encryption = (process.env.PEC_SMTP_ENCRYPTION || "ssl").toLowerCase();

  if (!host || !user || !pass) {
    throw new Error("Casella PEC non configurata");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: encryption === "ssl" || port === 465,
    auth: { user, pass },
    tls: process.env.PEC_SMTP_VERIFY_SSL === "false" ? { rejectUnauthorized: false } : undefined,
  });
}

function createEmailTransport(): Transporter {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Email non configurata (Resend)");
  }

  return nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: { user: "resend", pass: apiKey },
  });
}

function createTransportForChannel(channel: PostaChannel): Transporter {
  return channel === "pec" ? createPecTransport() : createEmailTransport();
}

export async function sendPecOrSmtpMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  channel?: PostaChannel;
  isPec?: boolean;
  fromName?: string;
  replyTo?: string;
}) {
  const channel: PostaChannel = options.channel ?? (options.isPec ? "pec" : "email");
  if (!isChannelMailConfigured(channel)) {
    throw new Error(
      channel === "pec" ? "Casella PEC non configurata" : "Casella email non configurata"
    );
  }

  const transport = createTransportForChannel(channel);
  const mailConfig = getChannelMailConfig(channel);
  const fromAddress = mailConfig.fromAddress!;
  const fromName = options.fromName?.trim() || mailConfig.fromName;
  const replyTo =
    options.replyTo?.trim() ||
    (channel === "pec" ? process.env.PEC_REPLY_TO?.trim() : process.env.MAIL_REPLY_TO?.trim()) ||
    undefined;

  const info = await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? options.text.replace(/\n/g, "<br>"),
    replyTo,
    headers: channel === "pec" ? { "X-PEC": "true" } : undefined,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

export async function verifyPecSmtpConnection() {
  const transport = createPecTransport();
  await transport.verify();
  return true;
}
