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
    light: "opencode.svg",
    dark: "opencode.svg",
  },
  {
    id: "brand:codex",
    name: "Codex / OpenAI",
    light: "codex.svg",
    dark: "codex.svg",
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
    id: "brand:qwen",
    name: "Qwen Code",
    light: "qwen.svg",
    dark: "qwen.svg",
  },
  {
    id: "brand:pi",
    name: "Pi Agent",
    light: "pi.svg",
    dark: "pi.svg",
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
    light: "kimi.svg",
    dark: "kimi.svg",
  },
  {
    id: "brand:cursor",
    name: "Cursor CLI",
    light: "cursor.svg",
    dark: "cursor.svg",
  },
  {
    id: "brand:copilot",
    name: "GitHub Copilot CLI",
    light: "copilot.svg",
    dark: "copilot.svg",
  },
  {
    id: "brand:cline",
    name: "Cline",
    light: "cline.svg",
    dark: "cline.svg",
  },
  {
    id: "brand:trae",
    name: "Trae",
    light: "trae.svg",
    dark: "trae.svg",
  },
  {
    id: "brand:codebuddy",
    name: "CodeBuddy",
    light: "codebuddy.svg",
    dark: "codebuddy.svg",
  },
  {
    id: "brand:openclaw",
    name: "OpenClaw",
    light: "openclaw.svg",
    dark: "openclaw.svg",
  },
  {
    id: "brand:mimo",
    name: "MiMo Code",
    light: "mimo.svg",
    dark: "mimo.svg",
  },
  {
    id: "brand:antigravity",
    name: "Antigravity",
    light: "antigravity.svg",
    dark: "antigravity.svg",
  },
  {
    id: "brand:minimax",
    name: "MiniMax CLI",
    light: "minimax.svg",
    dark: "minimax.svg",
  },
]


export const AGENT_PRESETS: AgentPresetDefinition[] = [
  {
    id: "opencode",
    name: "OpenCode",
    label: "OpenCode",
    icon: "brand:opencode",
    command: "opencode",
    cwd: "current",
  },
  {
    id: "codex",
    name: "Codex CLI",
    label: "Codex",
    icon: "brand:codex",
    command: "codex",
    cwd: "current",
  },
  {
    id: "claude",
    name: "Claude Code",
    label: "Claude Code",
    icon: "brand:claude",
    command: "claude",
    cwd: "current",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    label: "Gemini CLI",
    icon: "brand:gemini",
    command: "gemini",
    cwd: "current",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    label: "Qwen Code",
    icon: "brand:qwen",
    command: "qwen",
    cwd: "current",
  },
  {
    id: "pi",
    name: "Pi Agent",
    label: "Pi Agent",
    icon: "brand:pi",
    command: "pi",
    cwd: "current",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    label: "DeepSeek",
    icon: "brand:deepseek",
    command: "deepseek",
    cwd: "current",
  },
  {
    id: "zcode",
    name: "ZCode",
    label: "ZCode",
    icon: "brand:zcode",
    command: "zcode",
    cwd: "current",
  },
  {
    id: "kimi",
    name: "Kimi Code",
    label: "Kimi Code",
    icon: "brand:kimi",
    command: "kimi",
    cwd: "current",
  },
  {
    id: "cursor",
    name: "Cursor CLI",
    label: "Cursor",
    icon: "brand:cursor",
    command: "agent",
    cwd: "current",
  },
  {
    id: "copilot",
    name: "GitHub Copilot CLI",
    label: "Copilot",
    icon: "brand:copilot",
    command: "copilot",
    cwd: "current",
  },
  {
    id: "cline",
    name: "Cline",
    label: "Cline",
    icon: "brand:cline",
    command: "cline",
    cwd: "current",
  },
  {
    id: "trae",
    name: "Trae",
    label: "Trae",
    icon: "brand:trae",
    command: "trae",
    cwd: "current",
  },
  {
    id: "codebuddy",
    name: "CodeBuddy",
    label: "CodeBuddy",
    icon: "brand:codebuddy",
    command: "codebuddy",
    cwd: "current",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    label: "OpenClaw",
    icon: "brand:openclaw",
    command: "openclaw tui",
    cwd: "current",
  },
  {
    id: "mimo",
    name: "MiMo Code",
    label: "MiMo Code",
    icon: "brand:mimo",
    command: "mimo",
    cwd: "current",
  },
  {
    id: "antigravity",
    name: "Antigravity CLI",
    label: "Antigravity",
    icon: "brand:antigravity",
    command: "agy",
    cwd: "current",
  },
  {
    id: "minimax",
    name: "MiniMax CLI",
    label: "MiniMax",
    icon: "brand:minimax",
    command: "mmx",
    cwd: "current",
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
  }
}

function emptyPreset(label: string): AgentPreset {
  return {
    label,
    icon: "emoji:👻",
    command: "",
    cwd: "current",
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

export function getConfiguredEntry(entries: unknown[], id: string) {
  return entries.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false
    }
    return (entry as Record<string, unknown>).id === id
  })
}

export function normalizeIcon(value: string) {
  const match = value.match(/^\$\(([^)]+)\)$/)
  return match ? match[1] : value.trim() || "emoji:👻"
}

export function normalizeButton(value: unknown, fallback: ButtonConfig, id: string): ButtonConfig {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {}
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
    icon,
    command: typeof record.command === "string" ? record.command : fallback.command,
    cwd,
  }
}

export function normalizeButtons(value: unknown): ButtonConfig[] {
  const entries = Array.isArray(value) ? value : []
  return BUTTON_IDS.map((id, index) => normalizeButton(getConfiguredEntry(entries, id), DEFAULT_BUTTONS[index], id))
}

function buttonFieldsEqual(a: ButtonConfig, b: ButtonConfig): boolean {
  return a.enabled === b.enabled
    && a.preset === b.preset
    && a.label === b.label
    && a.icon === b.icon
    && a.command === b.command
    && a.cwd === b.cwd
}

/** Only persist slots that differ from built-in defaults; empty slots load from DEFAULT_BUTTONS. */
export function compactButtonsForStorage(buttons: ButtonConfig[]): ButtonConfig[] {
  return buttons.filter((button, index) => !buttonFieldsEqual(button, DEFAULT_BUTTONS[index]))
}
