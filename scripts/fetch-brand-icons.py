#!/usr/bin/env python3
"""Download preset brand icons from LobeHub Lobe Icons (color variants first)."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDS = os.path.join(ROOT, "media", "brands")
PROXY = "http://127.0.0.1:7890"

LOBE_SVG = "https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons"
LOBE_PNG_LIGHT = "https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light"
TOC_URL = "https://unpkg.com/@lobehub/icons@latest/es/toc.json"

LIGHT_FILL = "#242424"
DARK_FILL = "#f3f3f3"

# local asset stem -> Lobe icon slug (see https://icons.lobehub.com)
BRAND_SLUGS: dict[str, str] = {
    "opencode": "opencode",
    "codex": "codex",
    "claude": "claudecode",
    "gemini": "geminicli",
    "qwen": "qwen",
    "pi": "pi",
    "deepseek": "deepseek",
    "zcode": "zhipu",
    "kimi": "kimi",
    "cursor": "cursor",
    "copilot": "copilot",
    "cline": "cline",
    "trae": "trae",
    "codebuddy": "codebuddy",
    "openclaw": "openclaw",
    "mimo": "xiaomimimo",
    "antigravity": "antigravity",
    "minimax": "minimax",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    proxy = urllib.request.ProxyHandler({"http": PROXY, "https": PROXY})
    opener = urllib.request.build_opener(proxy)
    with opener.open(req, timeout=60) as response:
        return response.read()


def save(path: str, content: bytes) -> None:
    with open(path, "wb") as file:
        file.write(content)
    print(f"saved {os.path.basename(path)} ({len(content)} bytes)")


def try_fetch(url: str) -> bytes | None:
    try:
        return fetch(url)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def load_toc() -> dict[str, dict]:
    toc = json.loads(fetch(TOC_URL).decode("utf-8"))
    slug_map: dict[str, dict] = {}
    for entry in toc:
        slug = entry["id"][0].lower() + entry["id"][1:]
        slug_map[slug] = entry
    return slug_map


def set_monochrome_fill(svg: str, fill: str) -> str:
    svg = svg.replace("fill=\"currentColor\"", f"fill=\"{fill}\"")
    svg = svg.replace("fill=\"#202020\"", f"fill=\"{fill}\"")
    svg = svg.replace("fill=\"#000000\"", f"fill=\"{fill}\"")
    svg = svg.replace("fill=\"#000\"", f"fill=\"{fill}\"")
    return svg


def tint_mono_svg(svg: bytes, color: str, light_fill: str, dark_fill: str) -> tuple[bytes, bytes]:
    text = svg.decode("utf-8")
    normalized = color.strip().lower()
    if normalized in {"#fff", "#ffffff", "fff", "ffffff"}:
        return (
            set_monochrome_fill(text, light_fill).encode("utf-8"),
            set_monochrome_fill(text, dark_fill).encode("utf-8"),
        )
    return (
        set_monochrome_fill(text, color).encode("utf-8"),
        set_monochrome_fill(text, color).encode("utf-8"),
    )


def remove_stale_assets(stem: str) -> None:
    pattern = re.compile(rf"^{re.escape(stem)}(-light|-dark)?\.(svg|png)$")
    for name in os.listdir(BRANDS):
        if pattern.match(name):
            os.remove(os.path.join(BRANDS, name))


# Hand-maintained composite icons (not overwritten by fetch).
CUSTOM_BRAND_ASSETS = {"mimo"}

# Local stems whose Lobe *-color.svg uses light glyphs on transparency (needs square avatar bg).
SQUARE_AVATAR_BACKGROUNDS: dict[str, dict[str, str]] = {
    "kimi": {"light": "#000000", "dark": "#1783FF"},
}


def wrap_square_avatar(svg: str, background: str) -> str:
    rect = f'<rect width="24" height="24" rx="5.5" fill="{background}"/>'
    if rect in svg:
        return svg
    marker = "</title>"
    if marker in svg:
        return svg.replace(marker, f"{marker}{rect}", 1)
    return svg.replace("<svg", f"<svg", 1).replace(">", f">{rect}", 1)


def save_square_avatar_assets(stem: str, color_svg: bytes, backgrounds: dict[str, str]) -> None:
    text = color_svg.decode("utf-8")
    for theme, background in backgrounds.items():
        wrapped = wrap_square_avatar(text, background)
        save(os.path.join(BRANDS, f"{stem}-{theme}.svg"), wrapped.encode("utf-8"))


def try_save_color_from_slug(stem: str, slug: str) -> bool:
    color_svg = try_fetch(f"{LOBE_SVG}/{slug}-color.svg")
    if color_svg:
        if stem in SQUARE_AVATAR_BACKGROUNDS:
            save_square_avatar_assets(stem, color_svg, SQUARE_AVATAR_BACKGROUNDS[stem])
            return True
        save(os.path.join(BRANDS, f"{stem}.svg"), color_svg)
        return True

    color_png = try_fetch(f"{LOBE_PNG_LIGHT}/{slug}-color.png")
    if color_png:
        save(os.path.join(BRANDS, f"{stem}.png"), color_png)
        return True

    return False


def save_mono_asset(stem: str, slug: str, toc: dict[str, dict]) -> None:
    mono_svg = try_fetch(f"{LOBE_SVG}/{slug}.svg")
    if not mono_svg:
        raise RuntimeError(f"No Lobe mono icon found for slug '{slug}' ({stem})")

    entry = toc.get(slug, {})
    color = entry.get("color", LIGHT_FILL)
    light_bytes, dark_bytes = tint_mono_svg(mono_svg, color, LIGHT_FILL, DARK_FILL)

    if light_bytes == dark_bytes:
        save(os.path.join(BRANDS, f"{stem}.svg"), light_bytes)
        return

    save(os.path.join(BRANDS, f"{stem}-light.svg"), light_bytes)
    save(os.path.join(BRANDS, f"{stem}-dark.svg"), dark_bytes)


def save_brand_asset(stem: str, slug: str, toc: dict[str, dict]) -> None:
    if stem in CUSTOM_BRAND_ASSETS:
        return

    remove_stale_assets(stem)

    if try_save_color_from_slug(stem, slug):
        return

    mono_slug = slug if try_fetch(f"{LOBE_SVG}/{slug}.svg") else None
    if not mono_slug:
        raise RuntimeError(f"No Lobe icon found for slug '{slug}' ({stem})")

    save_mono_asset(stem, mono_slug, toc)


def main() -> None:
    os.makedirs(BRANDS, exist_ok=True)
    toc = load_toc()

    for stem, slug in BRAND_SLUGS.items():
        save_brand_asset(stem, slug, toc)


if __name__ == "__main__":
    main()
