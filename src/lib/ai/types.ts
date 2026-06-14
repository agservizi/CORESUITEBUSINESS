export const AI_SCOPES = [
  "hub",
  "operations",
  "business",
  "tickets",
  "express",
  "finance",
  "opportunities",
  "practices",
  "marketing",
  "curriculum",
  "portal",
] as const;

export type AiScope = (typeof AI_SCOPES)[number];

export const AI_ACTIONS = [
  "chat",
  "summarize",
  "suggest",
  "triage",
  "extract",
  "draft",
  "improve",
  "briefing",
  "script",
] as const;

export type AiAction = (typeof AI_ACTIONS)[number];

export interface AiAssistRequest {
  scope: AiScope;
  action: AiAction;
  message?: string;
  entityId?: string;
  moduleKey?: string;
  context?: Record<string, unknown>;
}

export interface AiAssistLink {
  label: string;
  href: string;
}

export interface AiExecutedAction {
  tool: string;
  success: boolean;
  summary: string;
  moduleKey?: string;
  recordId?: string;
}

export interface AiAssistResponse {
  text: string;
  structured?: Record<string, unknown>;
  links?: AiAssistLink[];
  executedActions?: AiExecutedAction[];
  model?: string;
}

export interface AiStatusResponse {
  configured: boolean;
  model: string;
}
