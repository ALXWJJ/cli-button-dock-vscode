import { BUTTON_IDS } from "./constants"
import type { AgentPreset, AgentPresetDefinition, BrandIconDefinition, ButtonConfig, EmojiIconDefinition } from "./types"

export const EMOJI_ICON_OPTIONS: EmojiIconDefinition[] = [
  { id: "emoji:👻", name: "Ghost", glyph: "👻" },
  { id: "emoji:🐱", name: "Cat", glyph: "🐱" },
  { id: "emoji:🐰", name: "Rabbit", glyph: "🐰" },
  { id: "emoji:🐼", name: "Panda", glyph: "🐼" },
  { id: "emoji:🦊", name: "Fox", glyph: "🦊" },
  { id: "emoji:🐨", name: "Koala", glyph: "🐨" },
  { id: "emoji:🐸", name: "Frog", glyph: "🐸" },
  { id: "emoji:🐙", name: "Octopus", glyph: "🐙" },
  { id: "emoji:🐥", name: "Chick", glyph: "🐥" },
  { id: "emoji:🐹", name: "Hamster", glyph: "🐹" },
  { id: "emoji:🦄", name: "Unicorn", glyph: "🦄" },
  { id: "emoji:🧸", name: "Teddy bear", glyph: "🧸" },
]

export const BRAND_ICON_OPTIONS: BrandIconDefinition[] = [
  {
    id: "brand:opencode",
    name: "OpenCode",
    light: "icon.png",
    dark: "icon.png",
    root: "images",
  },
  {
    id: "brand:codex",
    name: "Codex / OpenAI",
    light: "codex-light.svg",
    dark: "codex-dark.svg",
  },
  {
    id: "brand:claude",
    name: "Claude",
    light: "claude.svg",
    dark: "claude.svg",
  },
  {
    id: "brand:gemini",
    name: "Gemini",
    light: "gemini.svg",
    dark: "gemini.svg",
  },
  {
    id: "brand:aider",
    name: "Aider",
    light: "aider.png",
    dark: "aider.png",
  },
  {
    id: "brand:goose",
    name: "Goose",
    light: "goose.svg",
    dark: "goose.svg",
  },
  {
    id: "brand:qwen",
    name: "Qwen Code",
    light: "qwen.svg",
    dark: "qwen.svg",
  },
  {
    id: "brand:pi",
    name: "Pi Agent",
    light: "pi-light.svg",
    dark: "pi-dark.svg",
  },
  {
    id: "brand:deepseek",
    name: "DeepSeek",
    light: "deepseek.svg",
    dark: "deepseek.svg",
  },
  {
    id: "brand:zcode",
    name: "ZCode",
    light: "zcode.svg",
    dark: "zcode.svg",
  },
  {
    id: "brand:kimi",
    name: "Kimi Code",
    light: "kimi-light.svg",
    dark: "kimi-dark.svg",
  },
]

export const LEGACY_PRESET_ICONS: Record<string, string[]> = {
  opencode: ["sparkle"],
  codex: ["hubot"],
  claude: ["comment-discussion"],
  gemini: ["sparkle"],
  aider: ["code"],
  goose: ["rocket"],
  qwen: ["lightbulb"],
}

export const AGENT_PRESETS: AgentPresetDefinition[] = [
  {
    id: "opencode",
    name: "OpenCode",
    label: "OpenCode",
    icon: "brand:opencode",
    command: "opencode",
    cwd: "current",
    context: "none",
  },
  {
    id: "codex",
    name: "Codex CLI",
    label: "Codex",
    icon: "brand:codex",
    command: "codex",
    cwd: "current",
    context: "none",
  },
  {
    id: "claude",
    name: "Claude Code",
    label: "Claude Code",
    icon: "brand:claude",
    command: "claude",
    cwd: "current",
    context: "none",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    label: "Gemini CLI",
    icon: "brand:gemini",
    command: "gemini",
    cwd: "current",
    context: "none",
  },
  {
    id: "aider",
    name: "Aider",
    label: "Aider",
    icon: "brand:aider",
    command: "aider",
    cwd: "current",
    context: "none",
  },
  {
    id: "goose",
    name: "Goose",
    label: "Goose",
    icon: "brand:goose",
    command: "goose",
    cwd: "current",
    context: "none",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    label: "Qwen Code",
    icon: "brand:qwen",
    command: "qwen",
    cwd: "current",
    context: "none",
  },
  {
    id: "pi",
    name: "Pi Agent",
    label: "Pi Agent",
    icon: "brand:pi",
    command: "pi",
    cwd: "current",
    context: "none",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    label: "DeepSeek",
    icon: "brand:deepseek",
    command: "deepseek",
    cwd: "current",
    context: "none",
  },
  {
    id: "zcode",
    name: "ZCode",
    label: "ZCode",
    icon: "brand:zcode",
    command: "zcode",
    cwd: "current",
    context: "none",
  },
  {
    id: "kimi",
    name: "Kimi Code",
    label: "Kimi Code",
    icon: "brand:kimi",
    command: "kimi",
    cwd: "current",
    context: "none",
  },
]

function createButton(id: string, preset: AgentPreset, enabled: boolean, presetId = "custom"): ButtonConfig {
  return {
    id,
    enabled,
    preset: presetId,
    label: preset.label,
    icon: preset.icon,
    command: preset.command,
    cwd: preset.cwd,
    context: preset.context,
  }
}

function emptyPreset(label: string): AgentPreset {
  return {
    label,
    icon: "emoji:👻",
    command: "",
    cwd: "current",
    context: "none",
  }
}

export const DEFAULT_BUTTONS: ButtonConfig[] = [
  createButton("01", AGENT_PRESETS[0], true, AGENT_PRESETS[0].id),
  createButton("02", AGENT_PRESETS[1], false, AGENT_PRESETS[1].id),
  createButton("03", AGENT_PRESETS[2], false, AGENT_PRESETS[2].id),
  createButton("04", AGENT_PRESETS[3], false, AGENT_PRESETS[3].id),
  createButton("05", AGENT_PRESETS[4], false, AGENT_PRESETS[4].id),
  createButton("06", emptyPreset("Agent 06"), false),
  createButton("07", emptyPreset("Agent 07"), false),
  createButton("08", emptyPreset("Agent 08"), false),
  createButton("09", emptyPreset("Agent 09"), false),
  createButton("10", emptyPreset("Agent 10"), false),
]

export function getConfiguredEntry(entries: unknown[], id: string, index: number) {
  const entryById = entries.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false
    }
    return (entry as Record<string, unknown>).id === id
  })
  if (entryById) {
    return entryById
  }

  const entryByIndex = entries[index]
  if (entryByIndex && typeof entryByIndex === "object") {
    const indexedId = (entryByIndex as Record<string, unknown>).id
    if (typeof indexedId === "string" && indexedId !== id) {
      return undefined
    }
  }
  return entryByIndex
}

export function normalizeIcon(value: string) {
  const match = value.match(/^\$\(([^)]+)\)$/)
  return match ? match[1] : value.trim() || "emoji:👻"
}

export function normalizePresetIcon(preset: string, icon: string) {
  const presetDefinition = AGENT_PRESETS.find((item) => item.id === preset)
  const legacyIcons = LEGACY_PRESET_ICONS[preset]
  if (presetDefinition && legacyIcons?.includes(icon)) {
    return presetDefinition.icon
  }
  return icon
}

export function normalizeButton(value: unknown, fallback: ButtonConfig, id: string): ButtonConfig {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const context = record.context === "opencode" ? "opencode" : fallback.context
  const cwd = record.cwd === "workspace" || record.cwd === "file" || record.cwd === "current"
    ? record.cwd
    : fallback.cwd
  const preset = typeof record.preset === "string" && record.preset.trim() ? record.preset.trim() : fallback.preset
  const icon = normalizeIcon(typeof record.icon === "string" ? record.icon : fallback.icon)
  return {
    id,
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    preset,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : fallback.label,
    icon: normalizePresetIcon(preset, icon),
    command: typeof record.command === "string" ? record.command : fallback.command,
    cwd,
    context,
  }
}

export function normalizeButtons(value: unknown): ButtonConfig[] {
  const entries = Array.isArray(value) ? value : []
  return BUTTON_IDS.map((id, index) => normalizeButton(getConfiguredEntry(entries, id, index), DEFAULT_BUTTONS[index], id))
}
