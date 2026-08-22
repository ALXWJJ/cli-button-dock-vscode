import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"

const CONFIGURATION_SECTION = "agentActionDock"
const CONFIGURATION_KEY = "buttons"
const BUTTON_COUNT = 10
const BUTTON_IDS = Array.from({ length: BUTTON_COUNT }, (_, index) => String(index + 1).padStart(2, "0"))
const OPENCODE_PORT_ENV = "_EXTENSION_OPENCODE_PORT"
const CUSTOM_ICON_DIR = "media/user-icons"
const CUSTOM_ICON_MAX_BYTES = 1024 * 1024
const CUSTOM_ICON_MIME_EXTENSIONS: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
}
const INLINE_SVG_PATTERN = /^(?:<\?xml[\s\S]*?\?>\s*)?<svg\b/i

type ButtonContext = "none" | "opencode"
type ButtonCwd = "current" | "workspace" | "file"
type ButtonIcon = string

type ButtonConfig = {
  id: string
  enabled: boolean
  preset: string
  label: string
  icon: ButtonIcon
  command: string
  cwd: ButtonCwd
  context: ButtonContext
}

type AgentPreset = Omit<ButtonConfig, "id" | "enabled" | "preset">
type AgentPresetDefinition = AgentPreset & { id: string; name: string }
type BrandIconDefinition = {
  id: string
  name: string
  light: string
  dark: string
  root?: string
}
type EmojiIconDefinition = {
  id: string
  name: string
  glyph: string
}

type ActiveContext = {
  workspaceFolder?: string
  file?: string
  relativeFile?: string
  fileRef?: string
  selection?: string
  lineStart?: string
  lineEnd?: string
}

const EMOJI_ICON_OPTIONS: EmojiIconDefinition[] = [
  { id: "emoji:👻", name: "幽灵", glyph: "👻" },
  { id: "emoji:🐱", name: "猫咪", glyph: "🐱" },
  { id: "emoji:🐰", name: "兔子", glyph: "🐰" },
  { id: "emoji:🐼", name: "熊猫", glyph: "🐼" },
  { id: "emoji:🦊", name: "狐狸", glyph: "🦊" },
  { id: "emoji:🐨", name: "考拉", glyph: "🐨" },
  { id: "emoji:🐸", name: "青蛙", glyph: "🐸" },
  { id: "emoji:🐙", name: "章鱼", glyph: "🐙" },
  { id: "emoji:🐥", name: "小鸡", glyph: "🐥" },
  { id: "emoji:🐹", name: "仓鼠", glyph: "🐹" },
  { id: "emoji:🦄", name: "独角兽", glyph: "🦄" },
  { id: "emoji:🧸", name: "小熊", glyph: "🧸" },
]

const BRAND_ICON_OPTIONS: BrandIconDefinition[] = [
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

const LEGACY_PRESET_ICONS: Record<string, string[]> = {
  opencode: ["sparkle"],
  codex: ["hubot"],
  claude: ["comment-discussion"],
  gemini: ["sparkle"],
  aider: ["code"],
  goose: ["rocket"],
  qwen: ["lightbulb"],
}

const AGENT_PRESETS: AgentPresetDefinition[] = [
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

const DEFAULT_BUTTONS: ButtonConfig[] = [
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

type SaveButtons = (buttons: ButtonConfig[]) => Promise<void>

export function activate(context: vscode.ExtensionContext) {
  let buttons = loadButtons()

  void updateButtonContexts(buttons)
  void migrateLegacyPresetIcons(buttons)
  void syncManifest(context, buttons).then((changed) => {
    if (changed) {
      vscode.window.showInformationMessage("Agent Action Dock button metadata changed. Reload the window to apply it.")
    }
  })

  for (const buttonId of BUTTON_IDS) {
    const disposable = vscode.commands.registerCommand(`agentActionDock.button${buttonId}`, async () => {
      const button = buttons.find((item) => item.id === buttonId)
      if (button) {
        await runButton(button, context)
      }
    })
    context.subscriptions.push(disposable)
  }

  const configureDisposable = vscode.commands.registerCommand("agentActionDock.configure", () => {
    openConfigurator(context, buttons, async (nextButtons) => {
      buttons = nextButtons
      await updateButtonContexts(nextButtons)
      await vscode.workspace
        .getConfiguration(CONFIGURATION_SECTION)
        .update(CONFIGURATION_KEY, nextButtons, vscode.ConfigurationTarget.Global)
    })
  })
  context.subscriptions.push(configureDisposable)

  const addFilepathDisposable = vscode.commands.registerCommand("agentActionDock.addFilepathToTerminal", async () => {
    const fileRef = getActiveContext().fileRef
    const terminal = vscode.window.activeTerminal
    if (!fileRef || !terminal) {
      return
    }

    // @ts-ignore VS Code exposes creationOptions at runtime, but its type is intentionally narrow.
    const port = terminal.creationOptions.env?.[OPENCODE_PORT_ENV]
    if (port) {
      await appendPrompt(parseInt(port, 10), fileRef)
    } else {
      terminal.sendText(fileRef, false)
    }
    terminal.show()
  })
  context.subscriptions.push(addFilepathDisposable)

  const configurationDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration(`${CONFIGURATION_SECTION}.${CONFIGURATION_KEY}`)) {
      return
    }

    buttons = loadButtons()
    void updateButtonContexts(buttons)
    void syncManifest(context, buttons).then((changed) => {
      if (changed) {
        vscode.window.showInformationMessage("Agent Action Dock button appearance changed. Reload the window to apply it.")
      }
    })
  })
  context.subscriptions.push(configurationDisposable)
}

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

function loadButtons(): ButtonConfig[] {
  const configured = vscode.workspace.getConfiguration(CONFIGURATION_SECTION).get<unknown>(CONFIGURATION_KEY)
  const entries = Array.isArray(configured) ? configured : []
  return BUTTON_IDS.map((id, index) => normalizeButton(getConfiguredEntry(entries, id, index), DEFAULT_BUTTONS[index], id))
}

function normalizeButtons(value: unknown): ButtonConfig[] {
  const entries = Array.isArray(value) ? value : []
  return BUTTON_IDS.map((id, index) => normalizeButton(getConfiguredEntry(entries, id, index), DEFAULT_BUTTONS[index], id))
}

function getConfiguredEntry(entries: unknown[], id: string, index: number) {
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

function normalizeButton(value: unknown, fallback: ButtonConfig, id: string): ButtonConfig {
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

function normalizeIcon(value: string) {
  const match = value.match(/^\$\(([^)]+)\)$/)
  return match ? match[1] : value.trim() || "emoji:👻"
}

function normalizePresetIcon(preset: string, icon: string) {
  const presetDefinition = AGENT_PRESETS.find((item) => item.id === preset)
  const legacyIcons = LEGACY_PRESET_ICONS[preset]
  if (presetDefinition && legacyIcons?.includes(icon)) {
    return presetDefinition.icon
  }
  return icon
}

async function migrateLegacyPresetIcons(buttons: ButtonConfig[]) {
  const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION)
  const configured = configuration.get<unknown>(CONFIGURATION_KEY)
  if (!Array.isArray(configured)) {
    return
  }
  const needsMigration = configured.some((entry, index) => {
    const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : undefined
    if (!record || typeof record.icon !== "string") {
      return false
    }
    const id = typeof record.id === "string" ? record.id : BUTTON_IDS[index]
    const fallback = DEFAULT_BUTTONS.find((button) => button.id === id)
    const preset = typeof record.preset === "string" && record.preset.trim()
      ? record.preset.trim()
      : fallback?.preset ?? "custom"
    const icon = normalizeIcon(record.icon)
    return normalizePresetIcon(preset, icon) !== icon
  })
  if (!needsMigration) {
    return
  }
  await configuration.update(CONFIGURATION_KEY, buttons, vscode.ConfigurationTarget.Global)
}

async function updateButtonContexts(buttons: ButtonConfig[]) {
  await Promise.all(buttons.map((button) =>
    vscode.commands.executeCommand("setContext", `agentActionDock.button${button.id}Enabled`, button.enabled),
  ))
}

type PreparedCustomIcon = {
  bytes: Buffer
  extension: string
}

function isCustomIcon(icon: string) {
  const value = icon.trim()
  return /^(?:https?:\/\/|data:image\/)/i.test(value) || INLINE_SVG_PATTERN.test(value)
}

function getCustomIconCacheKey(icon: string) {
  return crypto.createHash("sha256").update(icon.trim()).digest("hex").slice(0, 24)
}

function getCachedCustomIconPath(directory: string, cacheKey: string) {
  if (!fs.existsSync(directory)) {
    return undefined
  }

  try {
    const fileName = fs.readdirSync(directory).find((entry) => {
      if (!entry.startsWith(`${cacheKey}.`)) {
        return false
      }
      return fs.statSync(path.join(directory, entry)).isFile()
    })
    return fileName ? `${CUSTOM_ICON_DIR}/${fileName}` : undefined
  } catch (error) {
    console.warn("[Agent Action Dock] Unable to inspect custom icon cache", error)
    return undefined
  }
}

function getImageExtensionFromPath(value: string) {
  try {
    const extension = path.extname(new URL(value).pathname).slice(1).toLowerCase()
    if (extension === "jpeg") {
      return "jpg"
    }
    return ["gif", "ico", "jpg", "png", "svg", "webp"].includes(extension) ? extension : undefined
  } catch {
    return undefined
  }
}

function validateCustomIconSize(bytes: Buffer) {
  if (bytes.length === 0) {
    throw new Error("The custom icon is empty.")
  }
  if (bytes.length > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom icon is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }
}

function sanitizeSvg(value: string) {
  const svg = value.trim()
  if (!INLINE_SVG_PATTERN.test(svg)) {
    throw new Error("Custom SVG icons must contain an <svg> element.")
  }
  if (Buffer.byteLength(svg, "utf8") > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom SVG is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }
  if (/<\/?(?:script|foreignObject|iframe|object|embed)\b/i.test(svg)) {
    throw new Error("Custom SVG icons cannot contain script or embedded document elements.")
  }
  if (/(?:javascript:|vbscript:|data:text\/html)/i.test(svg)) {
    throw new Error("Custom SVG icons cannot contain executable or HTML data URLs.")
  }

  const sanitized = svg
    .replace(/\son[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  return sanitized
}

function decodeDataImage(value: string): PreparedCustomIcon {
  const match = value.match(/^data:(image\/[^;,]+)(;[^,]*)?,([\s\S]*)$/i)
  if (!match) {
    throw new Error("Custom data images must use an image MIME type.")
  }

  const mimeType = match[1].toLowerCase()
  const extension = CUSTOM_ICON_MIME_EXTENSIONS[mimeType]
  if (!extension) {
    throw new Error(`Unsupported custom image type: ${mimeType}`)
  }

  const metadata = match[2] ?? ""
  let bytes: Buffer
  try {
    bytes = metadata.toLowerCase().includes(";base64")
      ? Buffer.from(match[3].replace(/\s/g, ""), "base64")
      : Buffer.from(decodeURIComponent(match[3]), "utf8")
  } catch {
    throw new Error("The custom data image could not be decoded.")
  }

  if (extension === "svg") {
    bytes = Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8")
  }
  validateCustomIconSize(bytes)
  return { bytes, extension }
}

async function downloadCustomIcon(value: string): Promise<PreparedCustomIcon> {
  const url = new URL(value)
  if (url.protocol !== "https:") {
    throw new Error("Custom image links must use HTTPS.")
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    throw new Error(`The custom image link returned HTTP ${response.status}.`)
  }
  if (new URL(response.url).protocol !== "https:") {
    throw new Error("Custom image links cannot redirect to HTTP.")
  }

  const contentLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > CUSTOM_ICON_MAX_BYTES) {
    throw new Error(`The custom image is larger than ${CUSTOM_ICON_MAX_BYTES} bytes.`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  validateCustomIconSize(bytes)
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase()
  const extension = (mimeType && CUSTOM_ICON_MIME_EXTENSIONS[mimeType]) ?? getImageExtensionFromPath(value)
  if (!extension) {
    throw new Error("The custom image link must point to SVG, PNG, JPEG, GIF, WEBP, or ICO content.")
  }

  if (extension === "svg") {
    return { bytes: Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8"), extension }
  }
  return { bytes, extension }
}

async function ensureCustomIconAsset(context: vscode.ExtensionContext, icon: string) {
  const source = icon.trim()
  const cacheKey = getCustomIconCacheKey(source)
  const directory = path.join(context.extensionPath, CUSTOM_ICON_DIR)
  const cachedPath = getCachedCustomIconPath(directory, cacheKey)
  if (cachedPath) {
    return cachedPath
  }

  let prepared: PreparedCustomIcon
  if (INLINE_SVG_PATTERN.test(source)) {
    prepared = { bytes: Buffer.from(sanitizeSvg(source), "utf8"), extension: "svg" }
  } else if (/^data:image\//i.test(source)) {
    prepared = decodeDataImage(source)
  } else {
    prepared = await downloadCustomIcon(source)
  }

  validateCustomIconSize(prepared.bytes)
  fs.mkdirSync(directory, { recursive: true })
  const fileName = `${cacheKey}.${prepared.extension}`
  fs.writeFileSync(path.join(directory, fileName), prepared.bytes)
  return `${CUSTOM_ICON_DIR}/${fileName}`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function ensureEmojiIconAsset(context: vscode.ExtensionContext, emoji: EmojiIconDefinition) {
  const cacheKey = getCustomIconCacheKey(emoji.id)
  const directory = path.join(context.extensionPath, CUSTOM_ICON_DIR)
  const cachedPath = getCachedCustomIconPath(directory, cacheKey)
  if (cachedPath) {
    return cachedPath
  }

  fs.mkdirSync(directory, { recursive: true })
  const safeGlyph = escapeXml(emoji.glyph)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text x="12" y="19" text-anchor="middle" font-size="18" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${safeGlyph}</text></svg>`
  const fileName = `${cacheKey}.svg`
  fs.writeFileSync(path.join(directory, fileName), svg)
  return `${CUSTOM_ICON_DIR}/${fileName}`
}

async function syncManifest(context: vscode.ExtensionContext, buttons: ButtonConfig[]) {
  const manifestPath = path.join(context.extensionPath, "package.json")
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      contributes?: {
        commands?: Array<Record<string, unknown>>
        menus?: Record<string, Array<Record<string, unknown>>>
      }
    }
    const before = JSON.stringify(manifest)
    const buttonById = new Map(buttons.map((button) => [button.id, button]))

    if (manifest.contributes?.commands) {
      manifest.contributes.commands = await Promise.all(manifest.contributes.commands.map(async (command) => {
        const commandId = typeof command.command === "string" ? command.command : ""
        const buttonId = commandId.match(/^agentActionDock\.button(\d{2})$/)?.[1]
        const button = buttonId ? buttonById.get(buttonId) : undefined
        if (!button) {
          return command
        }
        return {
          ...command,
          title: button.label,
          icon: await toManifestIcon(context, button.icon),
        }
      }))
    }

    if (manifest.contributes?.menus?.["editor/title"]) {
      const titleMenus = manifest.contributes.menus["editor/title"]
      const configureEntry = titleMenus.find((entry) => entry.command === "agentActionDock.configure") ?? {
        command: "agentActionDock.configure",
        group: "navigation@99",
      }
      manifest.contributes.menus["editor/title"] = [
        ...buttons.map((button, index) => ({
          command: `agentActionDock.button${button.id}`,
          when: `agentActionDock.button${button.id}Enabled`,
          group: `navigation@${index + 1}`,
        })),
        configureEntry,
      ]
    }

    const after = JSON.stringify(manifest)
    if (before === after) {
      return false
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    return true
  } catch (error) {
    console.error("[Agent Action Dock] Unable to update package.json", error)
    return false
  }
}

function toCodicon(icon: string) {
  return icon.startsWith("$(") ? icon : `$(${icon})`
}

function getBrandIcon(icon: string) {
  const normalized = normalizeIcon(icon)
  return BRAND_ICON_OPTIONS.find((item) => item.id === normalized)
}

function getEmojiIcon(icon: string) {
  const normalized = normalizeIcon(icon)
  return EMOJI_ICON_OPTIONS.find((item) => item.id === normalized)
}

function getBrandAssetPath(brand: BrandIconDefinition, theme: "light" | "dark") {
  const fileName = theme === "light" ? brand.light : brand.dark
  return `${brand.root ?? "media/brands"}/${fileName}`
}

function getExtensionAssetUri(extensionUri: vscode.Uri, relativePath: string) {
  return vscode.Uri.joinPath(extensionUri, ...relativePath.split("/"))
}

async function toManifestIcon(context: vscode.ExtensionContext, icon: string) {
  const brand = getBrandIcon(icon)
  if (brand) {
    return {
      light: getBrandAssetPath(brand, "light"),
      dark: getBrandAssetPath(brand, "dark"),
    }
  }

  const emoji = getEmojiIcon(icon)
  if (emoji) {
    try {
      const emojiPath = ensureEmojiIconAsset(context, emoji)
      return { light: emojiPath, dark: emojiPath }
    } catch (error) {
      console.warn("[Agent Action Dock] Unable to prepare emoji command icon", error)
      return toCodicon("terminal")
    }
  }

  if (!isCustomIcon(icon)) {
    return toCodicon(icon)
  }

  try {
    const customPath = await ensureCustomIconAsset(context, icon)
    return { light: customPath, dark: customPath }
  } catch (error) {
    console.warn("[Agent Action Dock] Unable to prepare custom command icon", error)
    return toCodicon("terminal")
  }
}

async function getTerminalIconPath(extensionContext: vscode.ExtensionContext, icon: string) {
  const brand = getBrandIcon(icon)
  if (brand) {
    return {
      light: getExtensionAssetUri(extensionContext.extensionUri, getBrandAssetPath(brand, "light")),
      dark: getExtensionAssetUri(extensionContext.extensionUri, getBrandAssetPath(brand, "dark")),
    }
  }

  const emoji = getEmojiIcon(icon)
  if (emoji) {
    try {
      const emojiPath = ensureEmojiIconAsset(extensionContext, emoji)
      const emojiUri = getExtensionAssetUri(extensionContext.extensionUri, emojiPath)
      return { light: emojiUri, dark: emojiUri }
    } catch (error) {
      console.warn("[Agent Action Dock] Unable to prepare emoji terminal icon", error)
      return new vscode.ThemeIcon("terminal")
    }
  }

  if (!isCustomIcon(icon)) {
    return new vscode.ThemeIcon(normalizeIcon(icon))
  }

  try {
    const customPath = await ensureCustomIconAsset(extensionContext, icon)
    const customUri = getExtensionAssetUri(extensionContext.extensionUri, customPath)
    return { light: customUri, dark: customUri }
  } catch (error) {
    console.warn("[Agent Action Dock] Unable to prepare custom terminal icon", error)
    return new vscode.ThemeIcon("terminal")
  }
}

async function runButton(button: ButtonConfig, extensionContext: vscode.ExtensionContext) {
  if (!button.command.trim()) {
    vscode.window.showWarningMessage(`Configure a command for ${button.label} first.`)
    return
  }

  const activeContext = getActiveContext()
  const terminalName = button.label
  const existingTerminal = vscode.window.terminals.find((terminal) => terminal.name === terminalName)

  if (existingTerminal) {
    existingTerminal.show()
    return
  }

  const port = button.context === "opencode" ? getRandomPort() : undefined
  const terminal = vscode.window.createTerminal({
    name: terminalName,
    cwd: getWorkingDirectory(button, activeContext),
    iconPath: await getTerminalIconPath(extensionContext, button.icon),
    location: {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: false,
    },
    env: port
      ? {
          [OPENCODE_PORT_ENV]: port.toString(),
          OPENCODE_CALLER: "vscode",
        }
      : undefined,
  })

  terminal.show()
  terminal.sendText(expandCommand(button.command, activeContext, port), true)

  if (button.context !== "opencode" || !port || !activeContext.fileRef) {
    return
  }

  if (await waitForOpenCode(port)) {
    await appendPrompt(port, `In ${activeContext.fileRef}`)
    terminal.show()
  }
}

function getWorkingDirectory(button: ButtonConfig, activeContext: ActiveContext) {
  if (button.cwd === "file" && activeContext.file) {
    return path.dirname(activeContext.file)
  }
  if (button.cwd === "workspace") {
    return activeContext.workspaceFolder
  }
  return undefined
}

function getActiveContext(): ActiveContext {
  const activeEditor = vscode.window.activeTextEditor
  if (!activeEditor) {
    return {}
  }

  const document = activeEditor.document
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  const relativeFile = workspaceFolder
    ? vscode.workspace.asRelativePath(document.uri).replaceAll("\\", "/")
    : undefined
  const selection = activeEditor.selection
  const lineStart = String(selection.start.line + 1)
  const lineEnd = String(selection.end.line + 1)
  let fileRef = relativeFile ? `@${relativeFile}` : undefined

  if (fileRef && !selection.isEmpty) {
    fileRef += lineStart === lineEnd ? `#L${lineStart}` : `#L${lineStart}-${lineEnd}`
  }

  return {
    workspaceFolder: workspaceFolder?.uri.fsPath,
    file: document.uri.fsPath,
    relativeFile,
    fileRef,
    selection: selection.isEmpty ? undefined : document.getText(selection),
    lineStart,
    lineEnd,
  }
}

function expandCommand(command: string, activeContext: ActiveContext, port?: number) {
  const values: Record<string, string> = {
    workspaceFolder: activeContext.workspaceFolder ?? "",
    file: activeContext.file ?? "",
    relativeFile: activeContext.relativeFile ?? "",
    fileRef: activeContext.fileRef ?? "",
    selection: activeContext.selection ?? "",
    lineStart: activeContext.lineStart ?? "",
    lineEnd: activeContext.lineEnd ?? "",
    port: port?.toString() ?? "",
  }

  return command.replace(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}|\$\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, curlyName, dollarName) => {
    const name = curlyName ?? dollarName
    return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match
  })
}

async function appendPrompt(port: number, text: string) {
  await fetch(`http://localhost:${port}/tui/append-prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })
}

async function waitForOpenCode(port: number) {
  let tries = 10
  do {
    await new Promise((resolve) => setTimeout(resolve, 200))
    try {
      await fetch(`http://localhost:${port}/app`)
      return true
    } catch {}
    tries--
  } while (tries > 0)
  return false
}

function getRandomPort() {
  return Math.floor(Math.random() * (65535 - 16384 + 1)) + 16384
}

function openConfigurator(
  context: vscode.ExtensionContext,
  initialButtons: ButtonConfig[],
  saveButtons: SaveButtons,
) {
  const panel = vscode.window.createWebviewPanel(
    "agentActionDock.configurator",
    "Agent Action Dock",
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  )

  panel.webview.html = getConfiguratorHtml(panel.webview, context.extensionUri, initialButtons)
  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    if (!message || typeof message !== "object") {
      return
    }
    const data = message as { type?: string; buttons?: unknown }
    if (data.type === "save") {
      const nextButtons = normalizeButtons(data.buttons)
      await saveButtons(nextButtons)
      panel.webview.postMessage({ type: "saved", buttons: nextButtons })
    } else if (data.type === "reset") {
      const nextButtons = DEFAULT_BUTTONS.map((button) => ({ ...button }))
      await saveButtons(nextButtons)
      panel.webview.postMessage({ type: "config", buttons: nextButtons })
    } else if (data.type === "openAdvanced") {
      await vscode.commands.executeCommand("workbench.action.openSettingsJson")
    } else if (data.type === "reload") {
      await vscode.commands.executeCommand("workbench.action.reloadWindow")
    }
  }, undefined, context.subscriptions)
}

function getConfiguratorHtml(webview: vscode.Webview, extensionUri: vscode.Uri, buttons: ButtonConfig[]) {
  const nonce = crypto.randomBytes(16).toString("hex")
  const state = JSON.stringify(buttons).replaceAll("<", "\\u003c")
  const presets = JSON.stringify(AGENT_PRESETS).replaceAll("<", "\\u003c")
  const emojiIcons = JSON.stringify(EMOJI_ICON_OPTIONS).replaceAll("<", "\\u003c")
  const brandIcons = JSON.stringify(BRAND_ICON_OPTIONS.map((brand) => ({
    id: brand.id,
    name: brand.name,
    light: webview.asWebviewUri(getExtensionAssetUri(extensionUri, getBrandAssetPath(brand, "light"))).toString(),
    dark: webview.asWebviewUri(getExtensionAssetUri(extensionUri, getBrandAssetPath(brand, "dark"))).toString(),
  }))).replaceAll("<", "\\u003c")

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Action Dock</title>
  <style>
    :root { color-scheme: light dark; }
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); padding: 24px; max-width: 1180px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .hint { color: var(--vscode-descriptionForeground); margin: 0 0 16px; line-height: 1.5; }
    .toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; position: sticky; top: 0; padding: 8px 0; background: var(--vscode-editor-background); z-index: 2; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 7px 14px; cursor: pointer; border-radius: 2px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    #message { color: var(--vscode-testing-iconPassed); min-height: 20px; margin-left: 8px; }
    .table-head, .button-row { display: grid; grid-template-columns: 34px 52px minmax(150px, 0.9fr) minmax(150px, 0.9fr) 150px minmax(240px, 1.4fr); gap: 10px; align-items: center; }
    .table-head { color: var(--vscode-descriptionForeground); font-size: 12px; padding: 0 12px 6px; }
    .button-row { border: 1px solid var(--vscode-panel-border); padding: 9px 12px; margin: 6px 0; border-radius: 4px; }
    .button-row:focus-within { border-color: var(--vscode-focusBorder); }
    .slot { color: var(--vscode-descriptionForeground); font-weight: 600; }
    .enabled { width: 16px; height: 16px; justify-self: center; }
    input, select, textarea { box-sizing: border-box; width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); padding: 6px 8px; font: inherit; }
    textarea { resize: vertical; min-height: 100px; line-height: 1.4; }
    .icon-picker { position: relative; display: flex; gap: 5px; min-width: 0; }
    .icon-preview { display: inline-flex; align-items: center; justify-content: center; width: 32px; min-width: 32px; height: 32px; padding: 0; color: var(--vscode-icon-foreground, var(--vscode-foreground)); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); font-size: 18px; }
    .icon-preview:hover { background: var(--vscode-list-hoverBackground); }
    .icon-preview img, .icon-option img, .custom-icon-live-preview img { display: block; width: 20px; height: 20px; object-fit: contain; }
    .icon-custom-trigger { width: 32px; min-width: 32px; height: 32px; padding: 0; line-height: 1; }
    .icon-custom-trigger:hover { background: var(--vscode-list-hoverBackground); }
    .lucide-icon { display: block; width: 17px; height: 17px; }
    .icon-emoji { display: inline-flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; }
    .icon-menu { position: absolute; top: calc(100% + 5px); right: 0; z-index: 10; width: min(420px, 70vw); max-height: 340px; overflow: auto; padding: 8px; background: var(--vscode-quickInput-background, var(--vscode-editor-background)); border: 1px solid var(--vscode-focusBorder); box-shadow: 0 8px 24px var(--vscode-widget-shadow); }
    .icon-menu[hidden] { display: none; }
    .icon-search { margin-bottom: 8px; }
    .icon-grid { display: grid; grid-template-columns: repeat(8, minmax(32px, 1fr)); gap: 4px; }
    .icon-option { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; color: var(--vscode-foreground); background: transparent; border: 0; }
    .icon-option:hover, .icon-option.selected { color: var(--vscode-list-activeSelectionForeground); background: var(--vscode-list-activeSelectionBackground); }
    .custom-icon-editor { position: absolute; top: calc(100% + 5px); right: 0; z-index: 12; width: min(440px, 78vw); padding: 12px; background: var(--vscode-quickInput-background, var(--vscode-editor-background)); border: 1px solid var(--vscode-focusBorder); box-shadow: 0 8px 24px var(--vscode-widget-shadow); }
    .custom-icon-editor[hidden] { display: none; }
    .custom-icon-editor-header, .custom-icon-editor-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .custom-icon-editor-title { font-weight: 600; }
    .custom-icon-close { width: 26px; height: 26px; padding: 0; font-size: 18px; line-height: 1; }
    .custom-icon-live-preview { display: flex; align-items: center; justify-content: center; min-height: 68px; margin-top: 8px; color: var(--vscode-descriptionForeground); background: var(--vscode-editor-background); border: 1px dashed var(--vscode-panel-border); }
    .custom-icon-live-preview img { width: 44px; height: 44px; }
    .custom-icon-error { min-height: 18px; margin-top: 6px; color: var(--vscode-errorForeground); font-size: 12px; }
    .custom-icon-editor-actions { justify-content: flex-end; margin-top: 8px; }
    .advanced-hint { color: var(--vscode-descriptionForeground); font-size: 12px; margin-top: 14px; line-height: 1.5; }
    @media (max-width: 760px) {
      .table-head { display: none; }
      .button-row { grid-template-columns: 30px 42px 1fr 1fr; }
      .preset { grid-column: 3 / -1; }
      .label { grid-column: 3; }
      .icon-picker { grid-column: 3 / -1; }
      .command { grid-column: 3 / -1; }
    }
  </style>
</head>
<body>
  <h1>Agent Action Dock</h1>
  <p class="hint">每行配置一个按钮。预设会自动填入命令和 Agent 品牌图标，也可以直接修改执行命令；点击图标预览可从品牌图标和精选 Emoji 中选择。名称同时用于按钮和终端。默认使用当前终端目录、不注入文件上下文，并自动复用同名终端。</p>
  <div class="toolbar">
    <button id="save">保存配置</button>
    <button id="reset">恢复默认</button>
    <button id="reload">重载窗口（Reload Window）</button>
    <button id="advanced">编辑高级配置</button>
    <span id="message"></span>
  </div>
  <div class="table-head"><span>启用</span><span>按钮</span><span>预设</span><span>名称 / 终端</span><span>图标</span><span>执行命令</span></div>
  <main id="app"></main>
  <p class="advanced-hint">自定义图标不需要上传文件：点击图标右侧的 Lucide 图片图标编辑 SVG，点击链接图标设置 HTTPS 图片链接，并在面板中预览后应用；也可以填写 <code>data:image/...</code>。仅支持 HTTPS 链接，不支持 HTTP。HTTPS 图片会由扩展下载并缓存到本地，保存后请按提示重载窗口，也可以直接点击上方的 Reload Window。工作目录、上下文和变量等高级项请在 settings.json 的 <code>agentActionDock.buttons</code> 中编辑。</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = ${state};
    const presets = ${presets};
    const emojiIcons = ${emojiIcons};
    const brandIcons = ${brandIcons};
    const lucideIcons = {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5h6"/><path d="M19 2v6"/><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
      url: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>'
    };
    const app = document.getElementById('app');
    const message = document.getElementById('message');

    function textInput(className, value, placeholder) {
      const input = document.createElement('input');
      input.className = className;
      input.value = value || '';
      input.placeholder = placeholder || '';
      return input;
    }

    function selectInput(className, values, value) {
      const select = document.createElement('select');
      select.className = className;
      values.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        select.append(option);
      });
      select.value = value;
      return select;
    }

    function createLucideIcon(name) {
      const template = document.createElement('template');
      template.innerHTML = lucideIcons[name];
      const icon = template.content.firstElementChild;
      icon.classList.add('lucide-icon');
      icon.setAttribute('aria-hidden', 'true');
      return icon;
    }

    function iconName(value) {
      const raw = String(value || '').trim();
      const match = raw.match(/^\\$\\(([^)]+)\\)$/);
      return (match ? match[1] : raw) || 'terminal';
    }

    function isCustomImage(value) {
      const raw = String(value || '').trim();
      const lower = raw.toLowerCase();
      return lower.startsWith('https://') || lower.startsWith('data:image/') || lower.startsWith('<svg') || (lower.startsWith('<?xml') && lower.includes('<svg'));
    }

    function customImageSource(value) {
      const raw = String(value || '').trim();
      const lower = raw.toLowerCase();
      if (lower.startsWith('<svg') || (lower.startsWith('<?xml') && lower.includes('<svg'))) {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(raw);
      }
      return raw;
    }

    function createCustomImage(value) {
      const image = document.createElement('img');
      image.src = customImageSource(value);
      image.alt = '';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.setAttribute('aria-hidden', 'true');
      return image;
    }

    function isInlineSvg(value) {
      const raw = String(value || '').trim().toLowerCase();
      return raw.startsWith('<svg') || (raw.startsWith('<?xml') && raw.includes('<svg'));
    }

    function createCustomIconEditor(onApply) {
      const editor = document.createElement('div');
      editor.className = 'custom-icon-editor';
      editor.hidden = true;
      const header = document.createElement('div');
      header.className = 'custom-icon-editor-header';
      const title = document.createElement('span');
      title.className = 'custom-icon-editor-title';
      title.textContent = '自定义 SVG 图标';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'custom-icon-close';
      close.textContent = '×';
      close.title = '关闭';
      header.append(title, close);

      const field = document.createElement('textarea');
      field.className = 'custom-icon-value';
      field.spellcheck = false;
      field.setAttribute('aria-label', '自定义图标内容');
      const preview = document.createElement('div');
      preview.className = 'custom-icon-live-preview';
      const error = document.createElement('div');
      error.className = 'custom-icon-error';
      const actions = document.createElement('div');
      actions.className = 'custom-icon-editor-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = '取消';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.textContent = '应用图标';
      actions.append(cancel, apply);
      editor.append(header, field, preview, error, actions);

      let mode = 'svg';

      function updateMode(nextMode) {
        mode = nextMode === 'url' ? 'url' : 'svg';
        title.textContent = mode === 'svg' ? '自定义 SVG 图标' : '自定义图片链接';
        field.placeholder = mode === 'svg'
          ? '<svg viewBox="0 0 24 24">...</svg>'
          : 'https://.../icon.svg 或 data:image/...';
        renderPreview();
      }

      function renderPreview() {
        const raw = field.value.trim();
        preview.replaceChildren();
        error.textContent = '';
        if (!raw) {
          preview.textContent = mode === 'svg' ? '粘贴 SVG 后预览' : '输入图片链接后预览';
          return;
        }

        const valid = isCustomImage(raw) && (mode === 'svg' ? isInlineSvg(raw) : !isInlineSvg(raw));
        if (!valid) {
          preview.textContent = '暂时无法预览';
          error.textContent = mode === 'svg' ? '请输入以 <svg 开头的 SVG 内容。' : '请输入 HTTPS 图片链接或 data:image/...。';
          return;
        }

        const image = createCustomImage(raw);
        image.addEventListener('error', () => {
          preview.replaceChildren();
          preview.textContent = '图片无法加载';
          error.textContent = '请检查 SVG 内容、图片地址和网络连接。';
        });
        preview.append(image);
      }

      function hide() {
        editor.hidden = true;
      }

      close.addEventListener('click', (event) => { event.stopPropagation(); hide(); });
      cancel.addEventListener('click', (event) => { event.stopPropagation(); hide(); });
      field.addEventListener('input', renderPreview);
      apply.addEventListener('click', (event) => {
        event.stopPropagation();
        const raw = field.value.trim();
        const valid = isCustomImage(raw) && (mode === 'svg' ? isInlineSvg(raw) : !isInlineSvg(raw));
        if (!valid) {
          renderPreview();
          error.textContent = mode === 'svg' ? '请输入有效的 SVG 内容。' : '请输入有效的 HTTPS 图片链接或 data:image/...。';
          return;
        }
        onApply(raw);
        hide();
      });
      editor.addEventListener('click', (event) => event.stopPropagation());

      return {
        element: editor,
        open: (next, nextMode) => {
          const raw = String(next || '').trim();
          updateMode(nextMode);
          field.value = mode === 'svg'
            ? (isInlineSvg(raw) ? raw : '')
            : (isCustomImage(raw) && !isInlineSvg(raw) ? raw : '');
          renderPreview();
          editor.hidden = false;
          field.focus();
        },
      };
    }

    function createIconPicker(value, onChange) {
      const picker = document.createElement('div');
      picker.className = 'icon-picker';
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'icon-preview';
      const menu = document.createElement('div');
      menu.className = 'icon-menu';
      menu.hidden = true;
      const search = textInput('icon-search', '', '搜索品牌图标或 Emoji');
      search.setAttribute('aria-label', '搜索品牌图标或 Emoji');
      const grid = document.createElement('div');
      grid.className = 'icon-grid';
      const optionElements = [];
      const isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      let currentValue = value || '';

      function createBrandImage(brand) {
        const image = document.createElement('img');
        image.src = isDarkTheme ? brand.dark : brand.light;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        return image;
      }

      function createEmojiGlyph(emoji) {
        const glyph = document.createElement('span');
        glyph.className = 'icon-emoji';
        glyph.textContent = emoji.glyph;
        glyph.setAttribute('aria-hidden', 'true');
        return glyph;
      }

      function updatePreview(next) {
        currentValue = next || '';
        const custom = isCustomImage(next);
        const name = custom ? '自定义图标' : iconName(next);
        const brand = brandIcons.find((item) => item.id === name);
        const emoji = emojiIcons.find((item) => item.id === name);
        preview.replaceChildren();
        if (custom) {
          preview.append(createCustomImage(next));
        } else if (brand) {
          preview.append(createBrandImage(brand));
        } else if (emoji) {
          preview.append(createEmojiGlyph(emoji));
        } else {
          const glyph = document.createElement('span');
          glyph.className = 'icon-emoji';
          glyph.textContent = '👻';
          preview.append(glyph);
        }
        const displayName = custom ? '自定义图标' : (brand ? brand.name : (emoji ? emoji.name : name));
        preview.title = '选择图标：' + displayName;
        preview.setAttribute('aria-label', '选择图标：' + displayName);
        optionElements.forEach((item) => item.element.classList.toggle('selected', item.name === name));
      }

      const customEditor = createCustomIconEditor((next) => {
        currentValue = next;
        updatePreview(next);
        onChange(next);
      });

      function createCustomTrigger(iconName, title, mode) {
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'icon-custom-trigger';
        trigger.append(createLucideIcon(iconName));
        trigger.title = title;
        trigger.setAttribute('aria-label', title);
        trigger.addEventListener('click', (event) => {
          event.stopPropagation();
          menu.hidden = true;
          customEditor.open(currentValue, mode);
        });
        return trigger;
      }

      const customSvgTrigger = createCustomTrigger('svg', '自定义 SVG 图标', 'svg');
      const customUrlTrigger = createCustomTrigger('url', '设置 HTTPS 图片链接', 'url');

      function filterOptions() {
        const query = search.value.trim().toLowerCase();
        optionElements.forEach((item) => { item.element.hidden = !!query && !item.search.includes(query); });
      }

      brandIcons.forEach((brand) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'icon-option';
        option.title = brand.name + ' (' + brand.id + ')';
        option.setAttribute('aria-label', brand.name);
        option.append(createBrandImage(brand));
        option.addEventListener('click', (event) => {
          event.stopPropagation();
          updatePreview(brand.id);
          onChange(brand.id);
          menu.hidden = true;
          search.value = '';
          filterOptions();
        });
        optionElements.push({ element: option, name: brand.id, search: (brand.id + ' ' + brand.name).toLowerCase() });
        grid.append(option);
      });

      emojiIcons.forEach((emoji) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'icon-option';
        option.title = emoji.name + ' (' + emoji.id + ')';
        option.setAttribute('aria-label', emoji.name);
        option.append(createEmojiGlyph(emoji));
        option.addEventListener('click', (event) => {
          event.stopPropagation();
          updatePreview(emoji.id);
          onChange(emoji.id);
          menu.hidden = true;
          search.value = '';
          filterOptions();
        });
        optionElements.push({ element: option, name: emoji.id, search: (emoji.id + ' ' + emoji.name + ' ' + emoji.glyph).toLowerCase() });
        grid.append(option);
      });

      preview.addEventListener('click', (event) => {
        event.stopPropagation();
        customEditor.element.hidden = true;
        const shouldOpen = menu.hidden;
        document.querySelectorAll('.icon-menu').forEach((item) => { item.hidden = true; });
        menu.hidden = !shouldOpen;
        if (shouldOpen) {
          search.value = '';
          filterOptions();
          search.focus();
        }
      });
      search.addEventListener('input', filterOptions);
      menu.addEventListener('click', (event) => event.stopPropagation());
      menu.append(search, grid);
      picker.append(preview, customSvgTrigger, customUrlTrigger, menu, customEditor.element);
      updatePreview(currentValue);
      return {
        element: picker,
        setValue: (next) => {
          updatePreview(next || '');
        },
      };
    }

    function getPresetId(button) {
      return presets.some((preset) => preset.id === button.preset) ? button.preset : 'custom';
    }

    function render() {
      app.replaceChildren();
      state.forEach((button) => {
        const row = document.createElement('div');
        row.className = 'button-row';
        row.dataset.id = button.id;
        const enabled = document.createElement('input');
        enabled.type = 'checkbox';
        enabled.className = 'enabled';
        enabled.checked = !!button.enabled;
        const slot = document.createElement('span');
        slot.className = 'slot';
        slot.textContent = '按钮 ' + button.id;
        const presetOptions = [{ value: 'custom', label: '自定义' }].concat(presets.map((preset) => ({ value: preset.id, label: preset.name })));
        const preset = selectInput('preset', presetOptions, getPresetId(button));
        const label = textInput('label', button.label, '按钮名称');
        const iconPicker = createIconPicker(button.icon, (value) => { button.icon = value; });
        const command = textInput('command', button.command, '例如 codex');
        command.spellcheck = false;
        row.append(enabled, slot, preset, label, iconPicker.element, command);

        preset.addEventListener('change', () => {
          const selected = presets.find((item) => item.id === preset.value);
          button.preset = preset.value || 'custom';
          if (!selected) return;
          button.label = selected.label;
          button.icon = selected.icon;
          button.command = selected.command;
          button.cwd = selected.cwd;
          button.context = selected.context;
          label.value = selected.label;
          iconPicker.setValue(selected.icon);
          command.value = selected.command;
        });
        enabled.addEventListener('change', () => { button.enabled = enabled.checked; });
        label.addEventListener('input', () => { button.label = label.value; });
        command.addEventListener('input', () => { button.command = command.value; });
        app.append(row);
      });
    }

    document.addEventListener('click', () => {
      document.querySelectorAll('.icon-menu').forEach((item) => { item.hidden = true; });
      document.querySelectorAll('.custom-icon-editor').forEach((item) => { item.hidden = true; });
    });

    document.getElementById('save').addEventListener('click', () => {
      const next = state.map((button) => ({ ...button }));
      vscode.postMessage({ type: 'save', buttons: next });
    });

    document.getElementById('reset').addEventListener('click', () => vscode.postMessage({ type: 'reset' }));
    document.getElementById('reload').addEventListener('click', () => vscode.postMessage({ type: 'reload' }));
    document.getElementById('advanced').addEventListener('click', () => vscode.postMessage({ type: 'openAdvanced' }));
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data.type === 'config') {
        state = data.buttons;
        render();
        message.textContent = '已恢复默认配置';
      } else if (data.type === 'saved') {
        state = data.buttons || state;
        render();
        message.textContent = '已保存；重载窗口后更新右上角按钮';
      }
    });
    render();
  </script>
</body>
</html>`
}

export function deactivate() {}
