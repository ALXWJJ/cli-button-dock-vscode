import { describe, expect, test } from "bun:test"
import { DEFAULT_BUTTONS, compactButtonsForStorage, normalizeButton, normalizeIcon, normalizeButtons } from "../src/presets"
import { decodeDataImage, isCustomIcon, sanitizeSvg } from "../src/svg"
import { expandCommand } from "../src/template"

describe("expandCommand", () => {
  test("expands curly and dollar variables", () => {
    const result = expandCommand("run {{fileRef}} in ${relativeFile}", {
      fileRef: "@src/index.ts#L10",
      relativeFile: "src/index.ts",
    })
    expect(result).toBe("run @src/index.ts#L10 in src/index.ts")
  })

  test("leaves unknown variables unchanged", () => {
    expect(expandCommand("echo {{unknown}}", {})).toBe("echo {{unknown}}")
  })

  test("does not expand removed port variable", () => {
    expect(expandCommand("echo {{port}}", {})).toBe("echo {{port}}")
  })
})

describe("normalizeIcon", () => {
  test("unwraps codicon syntax", () => {
    expect(normalizeIcon("$(terminal)")).toBe("terminal")
  })

  test("falls back to default emoji icon", () => {
    expect(normalizeIcon("   ")).toBe("emoji:👻")
  })
})

describe("normalizeButton", () => {
  test("fills missing fields from fallback", () => {
    const button = normalizeButton({ enabled: true, label: "My Agent", icon: "emoji:🐱", command: "agent" }, DEFAULT_BUTTONS[5], "06")
    expect(button).toMatchObject({
      id: "06",
      enabled: true,
      label: "My Agent",
      icon: "emoji:🐱",
      command: "agent",
      cwd: "current",
    })
  })
})

describe("compactButtonsForStorage", () => {
  test("drops slots that match built-in defaults", () => {
    const stored = compactButtonsForStorage(DEFAULT_BUTTONS)
    expect(stored).toEqual([])
  })

  test("keeps only customized slots", () => {
    const buttons = normalizeButtons([
      { id: "03", enabled: true, label: "Claude Code", icon: "brand:claude", command: "claude", cwd: "current" },
    ])
    const stored = compactButtonsForStorage(buttons)
    expect(stored).toEqual([buttons[2]])
  })
})

describe("isCustomIcon", () => {
  test("detects inline svg and https urls", () => {
    expect(isCustomIcon("<svg viewBox=\"0 0 24 24\"></svg>")).toBe(true)
    expect(isCustomIcon("https://example.com/icon.svg")).toBe(true)
    expect(isCustomIcon("brand:codex")).toBe(false)
  })

  test("detects svg documents with xml comments", () => {
    const inkscape = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Created with Inkscape -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`
    expect(isCustomIcon(inkscape)).toBe(true)
  })
})

describe("sanitizeSvg", () => {
  test("strips event handlers", () => {
    const sanitized = sanitizeSvg('<svg onclick="alert(1)"><rect /></svg>')
    expect(sanitized).not.toContain("onclick")
  })

  test("extracts svg after xml prologue and comments", () => {
    const sanitized = sanitizeSvg(`<?xml version="1.0"?>
<!-- Generator: Adobe Illustrator -->
<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#f00"/></svg>`)
    expect(sanitized).toContain("<svg")
    expect(sanitized).toContain('fill="#f00"')
    expect(sanitized).toContain("xmlns=")
    expect(sanitized).not.toContain("Generator")
  })

  test("keeps fragment hrefs and style rules", () => {
    const sanitized = sanitizeSvg(`<svg viewBox="0 0 24 24">
<style>.st0{fill:#00f}</style>
<defs><path id="a" d="M0 0h24v24H0z"/></defs>
<use href="#a" class="st0"/>
</svg>`)
    expect(sanitized).toContain('href="#a"')
    expect(sanitized).toContain("<style>")
    expect(sanitized).toContain("fill:#00f")
  })

  test("strips scripts instead of rejecting the icon", () => {
    const sanitized = sanitizeSvg("<svg viewBox=\"0 0 24 24\"><script>alert(1)</script><rect width=\"24\" height=\"24\"/></svg>")
    expect(sanitized).not.toContain("<script")
    expect(sanitized).toContain("<rect")
  })
})

describe("decodeDataImage", () => {
  test("decodes svg data urls", () => {
    const svg = "<svg viewBox=\"0 0 24 24\"><rect /></svg>"
    const encoded = encodeURIComponent(svg)
    const result = decodeDataImage(`data:image/svg+xml;charset=utf-8,${encoded}`)
    expect(result.extension).toBe("svg")
    expect(result.bytes.toString("utf8")).toContain("<svg")
  })
})
