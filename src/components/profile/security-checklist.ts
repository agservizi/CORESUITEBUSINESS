import type { ProfileUser } from "@/components/profile/profile-utils";
import { isPasswordFresh, passwordAgeDays } from "@/lib/password-policy";

export interface SecurityCheckItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  points: number;
  actionLabel: string;
  action: "mfa" | "password" | "name" | "none";
}

export interface SecurityInsight {
  score: number;
  label: string;
  color: string;
  items: SecurityCheckItem[];
  pendingCount: number;
}

export function buildSecurityChecklist(user: ProfileUser): SecurityCheckItem[] {
  const passwordFresh = isPasswordFresh(user.passwordChangedAt, user.createdAt);
  const pwdDays = passwordAgeDays(user.passwordChangedAt, user.createdAt);
  const hasName = Boolean(user.name?.trim());

  return [
    {
      id: "mfa",
      label: "Autenticazione a due fattori",
      description: "Protegge l'accesso anche se la password viene compromessa.",
      done: user.mfaEnabled,
      points: 45,
      actionLabel: user.mfaEnabled ? "Configurato" : "Attiva MFA",
      action: user.mfaEnabled ? "none" : "mfa",
    },
    {
      id: "password",
      label: "Password aggiornata",
      description: passwordFresh
        ? `Ultimo aggiornamento ${pwdDays === 0 ? "oggi" : `${pwdDays} giorni fa`}.`
        : `Non aggiornata da ${pwdDays} giorni — consigliato ogni 90 giorni.`,
      done: passwordFresh,
      points: 30,
      actionLabel: passwordFresh ? "Aggiornata" : "Cambia password",
      action: passwordFresh ? "none" : "password",
    },
    {
      id: "profile",
      label: "Profilo completo",
      description: "Nome visibile in ticket, attività e audit interni.",
      done: hasName,
      points: 10,
      actionLabel: hasName ? "Completo" : "Aggiungi nome",
      action: hasName ? "none" : "name",
    },
    {
      id: "session",
      label: "Sessione verificata",
      description: user.lastLoginAt
        ? `Ultimo accesso ${new Date(user.lastLoginAt).toLocaleString("it-IT")}.`
        : "Accedi regolarmente per mantenere l'account attivo.",
      done: Boolean(user.lastLoginAt),
      points: 15,
      actionLabel: "OK",
      action: "none",
    },
  ];
}

export function getSecurityInsight(user: ProfileUser): SecurityInsight {
  const items = buildSecurityChecklist(user);
  const score = items.filter((i) => i.done).reduce((sum, i) => sum + i.points, 0);
  const pendingCount = items.filter((i) => !i.done && i.action !== "none").length;
  const label = score >= 85 ? "Protezione alta" : score >= 65 ? "Protezione media" : "Da rafforzare";
  const color = score >= 85 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444";
  return { score, label, color, items, pendingCount };
}
