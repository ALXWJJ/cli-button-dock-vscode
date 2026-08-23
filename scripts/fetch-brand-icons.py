#!/usr/bin/env python3
"""Download brand icons as SVG (official sources first)."""

from __future__ import annotations

import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDS = os.path.join(ROOT, "media", "brands")
PROXY = "http://127.0.0.1:7890"
LOBE = "https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons"

LIGHT_FILL = "#242424"
DARK_FILL = "#f3f3f3"

CODEX_PATH = (
    "M10.931 3.34a.112.112 0 0 0-.069-.104l-.038-.007c-1.537.05-2.45.318-3.714 1.002v6.683c.48-.248.936-.44 1.414-.58.695-.203 1.417-.292 2.303-.305l.038-.008a.113.113 0 0 0 .066-.104V3.341ZM2.363 9.919c0 .064.051.11.105.111l.33.008c1.162.046 2.042.243 2.975.662-.403-.585-1.008-1.075-1.654-1.292a.991.991 0 0 1-.674-.941v-5.14a6.36 6.36 0 0 0-.59-.076l-.37-.02a.115.115 0 0 0-.122.111v6.577Zm9.455-.001a.998.998 0 0 1-.877.992l-.101.007c-.832.012-1.47.095-2.066.27-.599.174-1.176.448-1.883.863a.444.444 0 0 1-.449 0c-1.299-.763-2.229-1.07-3.689-1.125l-.299-.008a.997.997 0 0 1-.977-.998V3.342c0-.573.478-1.017 1.038-.999l.417.023c.188.015.35.037.513.062v-.754c0-.708.749-1.244 1.429-.903.984.492 1.836 1.449 2.15 2.505 1.216-.617 2.222-.884 3.771-.934l.105.003a.998.998 0 0 1 .918.996v6.576ZM4.332 8.466c0 .049.03.087.07.1l.24.091a4.319 4.319 0 0 1 1.581 1.176V3.721c-.164-.803-.799-1.617-1.584-2.07l-.162-.088c-.025-.012-.054-.013-.088.009a.12.12 0 0 0-.057.102v6.792Z"
)


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    proxy = urllib.request.ProxyHandler({"http": PROXY, "https": PROXY})
    opener = urllib.request.build_opener(proxy)
    with opener.open(req, timeout=60) as response:
        return response.read()


def save(path: str, content: str | bytes) -> None:
    data = content.encode("utf-8") if isinstance(content, str) else content
    with open(path, "wb") as file:
        file.write(data)
    print(f"saved {os.path.basename(path)} ({len(data)} bytes)")


def set_monochrome_fill(svg: str, fill: str) -> str:
    svg = svg.replace("fill=\"currentColor\"", f"fill=\"{fill}\"")
    svg = svg.replace("fill=\"#202020\"", f"fill=\"{fill}\"")
    svg = svg.replace("fill=\"#000000\"", f"fill=\"{fill}\"")
    svg = svg.replace("fill=\"#000\"", f"fill=\"{fill}\"")
    return svg


def save_monochrome_pair(name: str, data: bytes) -> None:
    text = data.decode("utf-8")
    save(os.path.join(BRANDS, f"{name}-light.svg"), set_monochrome_fill(text, LIGHT_FILL))
    save(os.path.join(BRANDS, f"{name}-dark.svg"), set_monochrome_fill(text, DARK_FILL))


def save_shared(name: str, data: bytes) -> None:
    save(os.path.join(BRANDS, f"{name}.svg"), data)


def save_lobe_pair(name: str, lobe_name: str) -> None:
    save_monochrome_pair(name, fetch(f"{LOBE}/{lobe_name}.svg"))


def build_codex_svg(fill: str) -> str:
    return (
        f"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\">"
        f"<g transform=\"translate(2.4 2.4) scale(1.35)\" fill=\"{fill}\">"
        f"<path d=\"{CODEX_PATH}\"/>"
        f"</g></svg>"
    )


def main() -> None:
    os.makedirs(BRANDS, exist_ok=True)

    # Colorful / self-contained (same file for light and dark themes)
    save_shared("opencode", fetch("https://opencode.ai/favicon.svg"))
    save_shared("claude", fetch("https://claude.com/favicon.svg"))
    save_shared("goose", fetch("https://raw.githubusercontent.com/aaif-goose/goose/main/ui/desktop/src/images/icon.svg"))
    save_shared("qwen", fetch("https://raw.githubusercontent.com/QwenLM/qwen-code/main/packages/chrome-extension/public/icons/icon.svg"))
    save_shared("aider", fetch("https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/assets/logo.svg"))
    save_shared("openhands", fetch(f"{LOBE}/openhands-color.svg"))

    # Continue — continuedev/continue
    save(os.path.join(BRANDS, "continue-light.svg"), fetch("https://raw.githubusercontent.com/continuedev/continue/main/docs/logo/light.svg"))
    save(os.path.join(BRANDS, "continue-dark.svg"), fetch("https://raw.githubusercontent.com/continuedev/continue/main/docs/logo/dark.svg"))

    # Codex — openai/codex (monochrome mark)
    save(os.path.join(BRANDS, "codex-light.svg"), build_codex_svg(LIGHT_FILL))
    save(os.path.join(BRANDS, "codex-dark.svg"), build_codex_svg(DARK_FILL))

    # Monochrome marks (LobeHub icons where no official SVG exists)
    save_lobe_pair("gemini", "gemini")
    save_lobe_pair("deepseek", "deepseek")
    save_lobe_pair("kimi", "kimi")
    save_lobe_pair("zcode", "zhipu")
    save_lobe_pair("pi", "pi")
    save_lobe_pair("cursor", "cursor")
    save_lobe_pair("copilot", "githubcopilot")
    save_lobe_pair("windsurf", "windsurf")
    save_lobe_pair("cline", "cline")
    save_lobe_pair("amp", "amp")
    save_lobe_pair("roo", "roocode")
    save_lobe_pair("trae", "trae")
    save_lobe_pair("codebuddy", "codebuddy")
    save_lobe_pair("amazonq", "bedrock")


if __name__ == "__main__":
    main()
