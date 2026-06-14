const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export interface PasswordValidation {
  valid: boolean;
  error?: string;
  strength: "weak" | "fair" | "strong";
  score: number;
}

export function validatePassword(password: string): PasswordValidation {
  if (password.length < MIN_LENGTH) {
    return { valid: false, error: `Minimo ${MIN_LENGTH} caratteri`, strength: "weak", score: 0 };
  }
  if (password.length > MAX_LENGTH) {
    return { valid: false, error: `Massimo ${MAX_LENGTH} caratteri`, strength: "weak", score: 0 };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Deve contenere almeno una lettera e un numero",
      strength: "weak",
      score: 20,
    };
  }

  let score = 40;
  if (password.length >= 12) score += 20;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  if (password.length >= 16) score += 10;

  const strength = score >= 75 ? "strong" : score >= 55 ? "fair" : "weak";
  return { valid: true, strength, score: Math.min(100, score) };
}

export function isPasswordFresh(changedAt: string | null | undefined, fallbackCreatedAt: string) {
  const ref = changedAt ? new Date(changedAt) : new Date(fallbackCreatedAt);
  const days = (Date.now() - ref.getTime()) / 86400000;
  return days <= 90;
}

export function passwordAgeDays(changedAt: string | null | undefined, fallbackCreatedAt: string) {
  const ref = changedAt ? new Date(changedAt) : new Date(fallbackCreatedAt);
  return Math.floor((Date.now() - ref.getTime()) / 86400000);
}
