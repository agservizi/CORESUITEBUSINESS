#!/usr/bin/env python3
"""Patch .env for Hostinger production (hub + subdomain architecture)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT_DOMAIN = "coresuite.it"
HUB_URL = f"https://{ROOT_DOMAIN}"

# Non sovrascrivere DATABASE_URL in .env dev — produzione usa .env.production al deploy

OVERRIDES: dict[str, str] = {
    "HOSTNAME": "0.0.0.0",
    "NODE_ENV": "production",
    "NEXTAUTH_URL": HUB_URL,
    "NEXT_PUBLIC_APP_URL": HUB_URL,
    "APP_URL": HUB_URL,
    "PLATFORM_ROOT_DOMAIN": ROOT_DOMAIN,
    "NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN": ROOT_DOMAIN,
    "PLATFORM_USE_SUBDOMAINS": "true",
    "NEXT_PUBLIC_PLATFORM_USE_SUBDOMAINS": "true",
    "APP_DEBUG": "false",
    "ANNCSU_API_URL": f"https://business.{ROOT_DOMAIN}/api/anncsu_search.php?q=",
    "CORESUITE_ENDPOINTS": f"https://business.{ROOT_DOMAIN}/api/express_webhook.php",
}


def patch_line(key: str, value: str, line: str) -> str:
    if re.match(rf"^{re.escape(key)}=", line):
        escaped = value.replace('"', '\\"')
        if " " in value or "#" in value or value.startswith("http"):
            return f'{key}="{escaped}"'
        return f"{key}={value}"
    return line


def patch_env(content: str) -> str:
    lines = content.splitlines()
    seen: set[str] = set()
    out: list[str] = []

    for line in lines:
        updated = line
        for key, value in OVERRIDES.items():
            if re.match(rf"^{re.escape(key)}=", line):
                updated = patch_line(key, value, line)
                seen.add(key)
                break
        out.append(updated)

    missing = [k for k in OVERRIDES if k not in seen]
    if missing:
        out.append("")
        out.append("# ─── Production overrides (Hostinger deploy) ───────────────")
        for key in missing:
            value = OVERRIDES[key]
            escaped = value.replace('"', '\\"')
            if " " in value or value.startswith("http"):
                out.append(f'{key}="{escaped}"')
            else:
                out.append(f"{key}={value}")

    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: patch-production-env.py <path-to-.env>", file=sys.stderr)
        return 1

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        return 1

    path.write_text(patch_env(path.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"Patched {path} for {HUB_URL} + *.{ROOT_DOMAIN}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
