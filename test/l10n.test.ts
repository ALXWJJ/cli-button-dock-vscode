import { describe, expect, test } from "bun:test"
import { getLocaleBundle } from "../src/l10n/registry"
import { formatMessage, normalizeLocale } from "../src/l10n/resolve"

describe("normalizeLocale", () => {
  test("maps common VS Code language codes", () => {
    expect(normalizeLocale("en")).toBe("en")
    expect(normalizeLocale("en-US")).toBe("en")
    expect(normalizeLocale("zh-cn")).toBe("zh-cn")
    expect(normalizeLocale("zh-Hans")).toBe("zh-cn")
    expect(normalizeLocale("zh-tw")).toBe("zh-tw")
    expect(normalizeLocale("zh-Hant")).toBe("zh-tw")
    expect(normalizeLocale("ja")).toBe("ja")
    expect(normalizeLocale("ko")).toBe("ko")
    expect(normalizeLocale("de")).toBe("de")
    expect(normalizeLocale("fr")).toBe("fr")
    expect(normalizeLocale("es")).toBe("es")
    expect(normalizeLocale("pt-br")).toBe("pt-br")
    expect(normalizeLocale("pt")).toBe("pt-br")
    expect(normalizeLocale("ru")).toBe("ru")
    expect(normalizeLocale("it")).toBe("it")
  })

  test("falls back to English for unsupported locales", () => {
    expect(normalizeLocale("nl")).toBe("en")
    expect(normalizeLocale("pl-PL")).toBe("en")
  })
})

describe("locale bundles", () => {
  test("returns localized configurator strings", () => {
    expect(getLocaleBundle("ja").configurator.reset).toBe("既定値に戻す")
    expect(getLocaleBundle("fr").configurator.reset).toBe("Réinitialiser")
  })

  test("localizes emoji names", () => {
    expect(getLocaleBundle("ja").emojiNames["emoji:👻"]).toBe("おばけ")
    expect(getLocaleBundle("de").emojiNames["emoji:🐱"]).toBe("Katze")
  })

  test("formats command warning messages", () => {
    const es = getLocaleBundle("es").messages.configureCommandFirst
    expect(formatMessage(es, { label: "Codex" })).toBe("Configure primero un comando para Codex.")
    const zh = getLocaleBundle("zh-cn").messages.configureCommandFirst
    expect(formatMessage(zh, { label: "Codex" })).toBe("请先为 Codex 配置命令。")
  })
})
