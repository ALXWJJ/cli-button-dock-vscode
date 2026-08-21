import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"

const CONFIGURATION_SECTION = "agentActionDock"
const CONFIGURATION_KEY = "buttons"
const BUTTON_COUNT = 10
const BUTTON_IDS = Array.from({ length: BUTTON_COUNT }, (_, index) => String(index + 1).padStart(2, "0"))
const OPENCODE_PORT_ENV = "_EXTENSION_OPENCODE_PORT"

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

const ICON_OPTIONS = [
  "account",
  "agent",
  "alert",
  "add",
  "archive",
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "ask",
  "attach",
  "beaker",
  "bell",
  "book",
  "bookmark",
  "browser",
  "bug",
  "build",
  "calendar",
  "check",
  "check-all",
  "checklist",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "circle-filled",
  "circle-outline",
  "close",
  "cloud",
  "code",
  "comment",
  "comment-discussion",
  "copy",
  "database",
  "debug",
  "debug-console",
  "debug-start",
  "edit",
  "error",
  "eye",
  "eye-closed",
  "file",
  "file-code",
  "files",
  "filter",
  "folder",
  "folder-opened",
  "gear",
  "git-branch",
  "git-commit",
  "git-merge",
  "git-pull-request",
  "globe",
  "graph",
  "heart",
  "heart-filled",
  "history",
  "hubot",
  "info",
  "key",
  "kebab-vertical",
  "layout",
  "lightbulb",
  "link",
  "list-filter",
  "list-tree",
  "list-unordered",
  "lock-small",
  "logo-github",
  "markdown",
  "menu",
  "merge",
  "more",
  "new-file",
  "notebook",
  "package",
  "person",
  "pin",
  "play",
  "play-circle",
  "project",
  "question",
  "refresh",
  "remote",
  "remove",
  "repo",
  "repo-sync",
  "rocket",
  "run-all",
  "search",
  "server",
  "settings-gear",
  "shield",
  "source-control",
  "sparkle",
  "split-horizontal",
  "split-vertical",
  "star-full",
  "terminal",
  "terminal-bash",
  "terminal-cmd",
  "terminal-powershell",
  "thumbsdown",
  "thumbsup",
  "tools",
  "unlock",
  "vm",
  "warning-compact",
  "symbol-misc",
  "symbol-class",
  "symbol-color",
  "symbol-constant",
  "symbol-enum",
  "symbol-enum-member",
  "symbol-field",
  "symbol-file",
  "symbol-interface",
  "symbol-key",
  "symbol-keyword",
  "symbol-method",
  "symbol-module",
  "symbol-numeric",
  "symbol-operator",
  "symbol-parameter",
  "symbol-property",
  "symbol-reference",
  "symbol-ruler",
  "symbol-snippet",
  "symbol-string",
  "symbol-structure",
]

const BRAND_ICON_OPTIONS: BrandIconDefinition[] = [
  {
    id: "brand:opencode",
    name: "OpenCode",
    light: "opencode-light.svg",
    dark: "opencode-dark.svg",
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
    light: "gemini.png",
    dark: "gemini.png",
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
]

const DEFAULT_BUTTONS: ButtonConfig[] = [
  createButton("01", AGENT_PRESETS[0], true, AGENT_PRESETS[0].id),
  createButton("02", AGENT_PRESETS[1], true, AGENT_PRESETS[1].id),
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
  if (syncManifest(context, buttons)) {
    vscode.window.showInformationMessage("Agent Action Dock button metadata changed. Reload the window to apply it.")
  }

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
    if (syncManifest(context, buttons)) {
      vscode.window.showInformationMessage("Agent Action Dock button appearance changed. Reload the window to apply it.")
    }
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
    icon: "terminal",
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
  return match ? match[1] : value.trim() || "terminal"
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

function syncManifest(context: vscode.ExtensionContext, buttons: ButtonConfig[]) {
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
      manifest.contributes.commands = manifest.contributes.commands.map((command) => {
        const commandId = typeof command.command === "string" ? command.command : ""
        const buttonId = commandId.match(/^agentActionDock\.button(\d{2})$/)?.[1]
        const button = buttonId ? buttonById.get(buttonId) : undefined
        if (!button) {
          return command
        }
        return {
          ...command,
          title: button.label,
          icon: toManifestIcon(button.icon),
        }
      })
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

function toManifestIcon(icon: string) {
  const brand = getBrandIcon(icon)
  if (!brand) {
    return toCodicon(icon)
  }
  return {
    light: `media/brands/${brand.light}`,
    dark: `media/brands/${brand.dark}`,
  }
}

function getTerminalIconPath(extensionContext: vscode.ExtensionContext, icon: string) {
  const brand = getBrandIcon(icon)
  if (!brand) {
    return new vscode.ThemeIcon(normalizeIcon(icon))
  }
  return {
    light: vscode.Uri.joinPath(extensionContext.extensionUri, "media", "brands", brand.light),
    dark: vscode.Uri.joinPath(extensionContext.extensionUri, "media", "brands", brand.dark),
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
    iconPath: getTerminalIconPath(extensionContext, button.icon),
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
    }
  }, undefined, context.subscriptions)
}

function getConfiguratorHtml(webview: vscode.Webview, extensionUri: vscode.Uri, buttons: ButtonConfig[]) {
  const nonce = crypto.randomBytes(16).toString("hex")
  const state = JSON.stringify(buttons).replaceAll("<", "\\u003c")
  const presets = JSON.stringify(AGENT_PRESETS).replaceAll("<", "\\u003c")
  const icons = JSON.stringify(ICON_OPTIONS)
  const brandIcons = JSON.stringify(BRAND_ICON_OPTIONS.map((brand) => ({
    id: brand.id,
    name: brand.name,
    light: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "brands", brand.light)).toString(),
    dark: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "brands", brand.dark)).toString(),
  }))).replaceAll("<", "\\u003c")
  const codiconCssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "codicon.css"))
  const codiconFontUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "codicon.ttf"))

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Action Dock</title>
  <link rel="stylesheet" href="${codiconCssUri}" />
  <style>
    :root { color-scheme: light dark; }
    @font-face { font-family: "codicon"; font-display: block; src: url("${codiconFontUri}") format("truetype"); }
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
    input, select { box-sizing: border-box; width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); padding: 6px 8px; font: inherit; }
    .icon-picker { position: relative; display: flex; gap: 5px; min-width: 0; }
    .icon-preview { display: inline-flex; align-items: center; justify-content: center; width: 32px; min-width: 32px; height: 32px; padding: 0; color: var(--vscode-icon-foreground, var(--vscode-foreground)); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); font-size: 18px; }
    .icon-preview:hover { background: var(--vscode-list-hoverBackground); }
    .icon-preview img, .icon-option img { width: 20px; height: 20px; object-fit: contain; }
    .icon-menu { position: absolute; top: calc(100% + 5px); right: 0; z-index: 10; width: min(420px, 70vw); max-height: 340px; overflow: auto; padding: 8px; background: var(--vscode-quickInput-background, var(--vscode-editor-background)); border: 1px solid var(--vscode-focusBorder); box-shadow: 0 8px 24px var(--vscode-widget-shadow); }
    .icon-menu[hidden] { display: none; }
    .icon-search { margin-bottom: 8px; }
    .icon-grid { display: grid; grid-template-columns: repeat(8, minmax(32px, 1fr)); gap: 4px; }
    .icon-option { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; color: var(--vscode-foreground); background: transparent; border: 0; }
    .icon-option:hover, .icon-option.selected { color: var(--vscode-list-activeSelectionForeground); background: var(--vscode-list-activeSelectionBackground); }
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
  <p class="hint">每行配置一个按钮。预设会自动填入命令和 Agent 品牌图标，也可以直接修改执行命令；点击图标预览可从品牌图标和官方 Codicon 网格中选择。名称同时用于按钮和终端。默认使用当前终端目录、不注入文件上下文，并自动复用同名终端。</p>
  <div class="toolbar">
    <button id="save">保存配置</button>
    <button id="reset">恢复默认</button>
    <button id="advanced">编辑高级配置</button>
    <span id="message"></span>
  </div>
  <div class="table-head"><span>启用</span><span>按钮</span><span>预设</span><span>名称 / 终端</span><span>图标</span><span>执行命令</span></div>
  <main id="app"></main>
  <p class="advanced-hint">工作目录、上下文和变量等高级项请在 settings.json 的 <code>agentActionDock.buttons</code> 中编辑。</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = ${state};
    const presets = ${presets};
    const icons = ${icons};
    const brandIcons = ${brandIcons};
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

    function iconName(value) {
      const raw = String(value || '').trim();
      const match = raw.match(/^\\$\\(([^)]+)\\)$/);
      return (match ? match[1] : raw) || 'terminal';
    }

    function iconClassName(value) {
      return iconName(value).replace(/[^a-z0-9-]/gi, '') || 'terminal';
    }

    function createIconPicker(value, onChange) {
      const picker = document.createElement('div');
      picker.className = 'icon-picker';
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'icon-preview';
      const input = textInput('icon', value, 'terminal');
      input.spellcheck = false;
      const menu = document.createElement('div');
      menu.className = 'icon-menu';
      menu.hidden = true;
      const search = textInput('icon-search', '', '搜索品牌图标或 Codicon');
      search.setAttribute('aria-label', '搜索品牌图标或 Codicon');
      const grid = document.createElement('div');
      grid.className = 'icon-grid';
      const optionElements = [];
      const isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

      function createBrandImage(brand) {
        const image = document.createElement('img');
        image.src = isDarkTheme ? brand.dark : brand.light;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        return image;
      }

      function updatePreview(next) {
        const name = iconName(next);
        const brand = brandIcons.find((item) => item.id === name);
        preview.replaceChildren();
        if (brand) {
          preview.append(createBrandImage(brand));
        } else {
          const glyph = document.createElement('span');
          glyph.className = 'codicon codicon-' + iconClassName(name);
          preview.append(glyph);
        }
        preview.title = '选择图标：' + name;
        preview.setAttribute('aria-label', '选择图标：' + name);
        optionElements.forEach((item) => item.element.classList.toggle('selected', item.name === name));
      }

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
          input.value = brand.id;
          updatePreview(brand.id);
          onChange(brand.id);
          menu.hidden = true;
          search.value = '';
          filterOptions();
        });
        optionElements.push({ element: option, name: brand.id, search: (brand.id + ' ' + brand.name).toLowerCase() });
        grid.append(option);
      });

      icons.forEach((name) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'icon-option';
        option.title = name;
        option.setAttribute('aria-label', name);
        const optionGlyph = document.createElement('span');
        optionGlyph.className = 'codicon codicon-' + iconClassName(name);
        option.append(optionGlyph);
        option.addEventListener('click', (event) => {
          event.stopPropagation();
          input.value = name;
          updatePreview(name);
          onChange(name);
          menu.hidden = true;
          search.value = '';
          filterOptions();
        });
        optionElements.push({ element: option, name, search: name.toLowerCase() });
        grid.append(option);
      });

      preview.addEventListener('click', (event) => {
        event.stopPropagation();
        const shouldOpen = menu.hidden;
        document.querySelectorAll('.icon-menu').forEach((item) => { item.hidden = true; });
        menu.hidden = !shouldOpen;
        if (shouldOpen) {
          search.value = '';
          filterOptions();
          search.focus();
        }
      });
      input.addEventListener('input', () => { updatePreview(input.value); onChange(input.value); });
      search.addEventListener('input', filterOptions);
      menu.addEventListener('click', (event) => event.stopPropagation());
      menu.append(search, grid);
      picker.append(preview, input, menu);
      updatePreview(value);
      return { element: picker, setValue: (next) => { input.value = next || ''; updatePreview(next); } };
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
    });

    document.getElementById('save').addEventListener('click', () => {
      const next = state.map((button) => ({ ...button }));
      vscode.postMessage({ type: 'save', buttons: next });
    });

    document.getElementById('reset').addEventListener('click', () => vscode.postMessage({ type: 'reset' }));
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
