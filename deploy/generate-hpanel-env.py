#!/usr/bin/env python3
"""Genera deploy/hpanel-import.env da .env locale (valori produzione per hPanel)."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
SOURCE_ENV = PROJECT_ROOT / ".env"
PRODUCTION_ENV = PROJECT_ROOT / ".env.production"
OUTPUT_ENV = SCRIPT_DIR / "hpanel-import.env"
PATCH_SCRIPT = SCRIPT_DIR / "patch-production-env.py"

# Non servono a runtime sull'app Node.js Hostinger
SKIP_KEYS = {
    "HOSTINGER_API_TOKEN",
    "HOSTINGER_API_BASE_URI",
    "HOSTINGER_API_VERIFY_SSL",
}


def parse_env_lines(content: str) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, _, raw = stripped.partition("=")
        key = key.strip()
        value = raw.strip()
        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1].replace('\\"', '"')
        elif value.startswith("'") and value.endswith("'"):
            value = value[1:-1]
        entries.append((key, value))
    return entries


def format_value(value: str) -> str:
    if not value:
        return ""
    if any(c in value for c in " #\t\n\r\"'"):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return value


def load_patched_env_entries() -> list[tuple[str, str]]:
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".env", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(SOURCE_ENV.read_text(encoding="utf-8"))
        tmp_path = tmp.name

    result = subprocess.run(
        [sys.executable, str(PATCH_SCRIPT), tmp_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout or "patch-production-env failed")

    patched = Path(tmp_path).read_text(encoding="utf-8")
    Path(tmp_path).unlink(missing_ok=True)
    base_entries = parse_env_lines(patched)

    if not PRODUCTION_ENV.is_file():
        return base_entries

    prod_map = dict(parse_env_lines(PRODUCTION_ENV.read_text(encoding="utf-8")))
    merged: list[tuple[str, str]] = []
    seen: set[str] = set()
    for key, value in base_entries:
        merged.append((key, prod_map.get(key, value)))
        seen.add(key)
    for key, value in prod_map.items():
        if key not in seen:
            merged.append((key, value))
    return merged


def main() -> int:
    if not SOURCE_ENV.is_file():
        print(f"File non trovato: {SOURCE_ENV}", file=sys.stderr)
        return 1

    entries = load_patched_env_entries()

    lines = [
        "# Coresuite — variabili per import hPanel (Node.js → coresuite.it)",
        "# Generato da: python deploy/generate-hpanel-env.py",
        "# hPanel: Websites → coresuite.it → Node.js → Environment variables → Import",
        "",
    ]

    seen: set[str] = set()
    for key, value in entries:
        if key in SKIP_KEYS or key in seen:
            continue
        seen.add(key)
        lines.append(f"{key}={format_value(value)}")

    OUTPUT_ENV.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"Creato {OUTPUT_ENV} ({len(seen)} variabili)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
