#!/usr/bin/env python3
"""Build the static arena-fighter release without uploading development files."""

import argparse
import html
from pathlib import Path
import shutil
from urllib.parse import urlsplit
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "index.html", "style.css",
    "src/game.js", "src/engine.js", "src/renderer.js", "src/ai.js",
    "assets/fighters/bibi-portrait.png", "assets/fighters/bibi-idle.png",
    "assets/fighters/bibi-run.png", "assets/fighters/bibi-basic.png",
    "assets/fighters/bibi-charge.png", "assets/fighters/bibi-projectile.png",
    "assets/fighters/bibi-victory.png",
    "assets/fighters/ben-gvir-portrait.png", "assets/fighters/ben-gvir-idle.png",
    "assets/fighters/ben-gvir-run.png",
    "assets/fighters/ben-gvir-basic.png", "assets/fighters/ben-gvir-charge.png",
    "assets/fighters/ben-gvir-projectile.png", "assets/fighters/ben-gvir-victory.png",
    "assets/fighters/gotliv-idle.png", "assets/fighters/gotliv-throw.png",
    "assets/fighters/gotliv-charge.png", "assets/fighters/gotliv-projectile.png",
    "assets/fighters/bennett-idle.png", "assets/fighters/bennett-basic.png",
    "assets/fighters/bennett-charge.png", "assets/fighters/bennett-projectile.png",
]


def build(site_url=None):
    if site_url:
        parsed = urlsplit(site_url)
        if (parsed.scheme not in ("https", "http") or not parsed.netloc or
                parsed.username or parsed.password or parsed.query or parsed.fragment):
            raise ValueError("Use a public http(s) directory URL without credentials, query or fragment.")
        site_url = site_url.rstrip("/") + "/"

    output = ROOT / "dist"
    archive = ROOT / "brawalitzia-poc.zip"
    if output.is_symlink() or archive.is_symlink():
        raise ValueError("Release targets must not be symbolic links.")
    if output.exists():
        for entry in output.rglob("*"):
            if entry.is_symlink() or (entry.is_file() and entry.relative_to(output).as_posix() not in FILES):
                raise ValueError(f"Unexpected existing release file; inspect it before rebuilding: {entry}")
    for name in FILES:
        if not (ROOT / name).is_file():
            raise FileNotFoundError(f"Missing release asset: {name}.")
    for name in FILES:
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, destination)
    if site_url:
        index = output / "index.html"
        content = index.read_text(encoding="utf-8")
        url = html.escape(site_url, quote=True)
        content = content.replace("</head>", f'  <link rel="canonical" href="{url}">\n'
                                  f'    <meta property="og:url" content="{url}">\n  </head>')
        index.write_text(content, encoding="utf-8")
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for name in FILES:
            bundle.write(output / name, name)
    print(f"Built {len(FILES)} static files in dist/ and {archive.name}. Nothing was uploaded.")
    if not site_url:
        print("For public sharing metadata, rebuild with --site-url https://your-host/your-path/.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-url", help="Public directory URL for canonical and absolute Open Graph links")
    args = parser.parse_args()
    build(args.site_url)
