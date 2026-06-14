import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Coresuite AG Servizi";

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
