import { describe, expect, test } from "bun:test"
import { DEFAULT_BUTTONS, normalizeButton, normalizeIcon, normalizePresetIcon } from "../src/presets"
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

describe("normalizePresetIcon", () => {
  test("migrates legacy codex icon", () => {
    expect(normalizePresetIcon("codex", "hubot")).toBe("brand:codex")
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
      context: "none",
    })
  })
})

describe("isCustomIcon", () => {
  test("detects inline svg and https urls", () => {
    expect(isCustomIcon("<svg viewBox=\"0 0 24 24\"></svg>")).toBe(true)
    expect(isCustomIcon("https://example.com/icon.svg")).toBe(true)
    expect(isCustomIcon("brand:codex")).toBe(false)
  })
})

describe("sanitizeSvg", () => {
  test("strips event handlers", () => {
    const sanitized = sanitizeSvg('<svg onclick="alert(1)"><rect /></svg>')
    expect(sanitized).not.toContain("onclick")
  })

  test("rejects script tags", () => {
    expect(() => sanitizeSvg("<svg><script>alert(1)</script></svg>")).toThrow()
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
