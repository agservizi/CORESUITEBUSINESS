#!/usr/bin/env python3
"""Create a deploy zip with Unix directory execute bits (755) for Linux extract."""
from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path


def add_tree(zf: zipfile.ZipFile, base: Path) -> None:
    for root, dirs, files in os.walk(base):
        root_path = Path(root)
        for name in dirs:
            full = root_path / name
            arc = full.relative_to(base).as_posix() + "/"
            info = zipfile.ZipInfo(arc)
            info.external_attr = (0o755 & 0xFFFF) << 16
            zf.writestr(info, "")
        for name in files:
            full = root_path / name
            arc = full.relative_to(base).as_posix()
            info = zipfile.ZipInfo(arc)
            info.external_attr = (0o644 & 0xFFFF) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, full.read_bytes())


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: create-deploy-zip.py <source_dir> <output.zip>", file=sys.stderr)
        return 1
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        add_tree(zf, source)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
