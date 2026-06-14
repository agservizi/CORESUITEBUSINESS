import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import { getAgServiziCompany } from "@/config/ag-servizi-company";

const ISSUER = `Coresuite ${getAgServiziCompany().tradeName}`;

export function createMfaSecret(_email: string) {
  const secret = new Secret();
  return secret.base32;
}

export function verifyMfaToken(secretBase32: string, token: string) {
  const secret = Secret.fromBase32(secretBase32);
  return TOTP.validate({ secret, token, window: 1 }) !== null;
}

export async function getMfaQrDataUrl(email: string, secret: string) {
  const uri = new TOTP({
    issuer: ISSUER,
    label: email,
    secret,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  }).toString();
  return QRCode.toDataURL(uri);
}
