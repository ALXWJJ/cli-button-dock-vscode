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
  "terminal",
  "sparkle",
  "hubot",
  "comment-discussion",
  "code",
  "rocket",
  "lightbulb",
  "beaker",
  "bug",
  "tools",
  "github",
  "search",
  "play",
  "server",
  "symbol-misc",
  "folder-opened",
]

const AGENT_PRESETS: AgentPresetDefinition[] = [
  {
    id: "opencode",
    name: "OpenCode",
    label: "OpenCode",
    icon: "sparkle",
    command: "opencode",
    cwd: "current",
    context: "none",
  },
  {
    id: "codex",
    name: "Codex CLI",
    label: "Codex",
    icon: "hubot",
    command: "codex",
    cwd: "current",
    context: "none",
  },
  {
    id: "claude",
    name: "Claude Code",
    label: "Claude Code",
    icon: "comment-discussion",
    command: "claude",
    cwd: "current",
    context: "none",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    label: "Gemini CLI",
    icon: "sparkle",
    command: "gemini",
    cwd: "current",
    context: "none",
  },
  {
    id: "aider",
    name: "Aider",
    label: "Aider",
    icon: "code",
    command: "aider",
    cwd: "current",
    context: "none",
  },
  {
    id: "goose",
    name: "Goose",
    label: "Goose",
    icon: "rocket",
    command: "goose",
    cwd: "current",
    context: "none",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    label: "Qwen Code",
    icon: "lightbulb",
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

  updateButtonContexts(buttons)
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
    updateButtonContexts(buttons)
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
  return {
    id,
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    preset: typeof record.preset === "string" && record.preset.trim() ? record.preset.trim() : fallback.preset,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : fallback.label,
    icon: normalizeIcon(typeof record.icon === "string" ? record.icon : fallback.icon),
    command: typeof record.command === "string" ? record.command : fallback.command,
    cwd,
    context,
  }
}

function normalizeIcon(value: string) {
  const match = value.match(/^\$\(([^)]+)\)$/)
  return match ? match[1] : value.trim() || "terminal"
}

function updateButtonContexts(buttons: ButtonConfig[]) {
  for (const button of buttons) {
    void vscode.commands.executeCommand("setContext", `agentActionDock.button${button.id}Enabled`, button.enabled)
  }
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
          icon: toCodicon(button.icon),
        }
      })
    }

    if (manifest.contributes?.menus?.["editor/title"]) {
      manifest.contributes.menus["editor/title"] = buttons.map((button, index) => ({
        command: `agentActionDock.button${button.id}`,
        when: `agentActionDock.button${button.id}Enabled`,
        group: `navigation@${index + 1}`,
      }))
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
    iconPath: new vscode.ThemeIcon(button.icon),
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

  panel.webview.html = getConfiguratorHtml(panel.webview, initialButtons)
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

function getConfiguratorHtml(webview: vscode.Webview, buttons: ButtonConfig[]) {
  const nonce = crypto.randomBytes(16).toString("hex")
  const state = JSON.stringify(buttons).replaceAll("<", "\\u003c")
  const presets = JSON.stringify(AGENT_PRESETS).replaceAll("<", "\\u003c")
  const icons = JSON.stringify(ICON_OPTIONS)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
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
    .table-head, .button-row { display: grid; grid-template-columns: 34px 52px minmax(180px, 1fr) minmax(180px, 1fr) 180px; gap: 10px; align-items: center; }
    .table-head { color: var(--vscode-descriptionForeground); font-size: 12px; padding: 0 12px 6px; }
    .button-row { border: 1px solid var(--vscode-panel-border); padding: 9px 12px; margin: 6px 0; border-radius: 4px; }
    .button-row:focus-within { border-color: var(--vscode-focusBorder); }
    .slot { color: var(--vscode-descriptionForeground); font-weight: 600; }
    .enabled { width: 16px; height: 16px; justify-self: center; }
    input, select { box-sizing: border-box; width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); padding: 6px 8px; font: inherit; }
    .icon { font-family: var(--vscode-editor-font-family); }
    .advanced-hint { color: var(--vscode-descriptionForeground); font-size: 12px; margin-top: 14px; line-height: 1.5; }
    @media (max-width: 760px) {
      .table-head { display: none; }
      .button-row { grid-template-columns: 30px 42px 1fr 1fr; }
      .preset { grid-column: 3 / -1; }
      .label { grid-column: 3; }
      .icon { grid-column: 4; }
    }
  </style>
</head>
<body>
  <h1>Agent Action Dock</h1>
  <p class="hint">每行配置一个按钮。预设会自动填入命令和图标；名称同时用于按钮和终端。默认使用当前终端目录、不注入文件上下文，并自动复用同名终端。</p>
  <div class="toolbar">
    <button id="save">保存配置</button>
    <button id="reset">恢复默认</button>
    <button id="advanced">编辑高级配置</button>
    <span id="message"></span>
  </div>
  <div class="table-head"><span>启用</span><span>按钮</span><span>预设</span><span>名称 / 终端</span><span>图标 Codicon</span></div>
  <datalist id="icon-options"></datalist>
  <main id="app"></main>
  <p class="advanced-hint">命令、工作目录、上下文和变量等高级项请在 settings.json 的 <code>agentActionDock.buttons</code> 中编辑。</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = ${state};
    const presets = ${presets};
    const icons = ${icons};
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
        const icon = textInput('icon', button.icon, 'terminal');
        icon.setAttribute('list', 'icon-options');
        row.append(enabled, slot, preset, label, icon);

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
          icon.value = selected.icon;
        });
        enabled.addEventListener('change', () => { button.enabled = enabled.checked; });
        label.addEventListener('input', () => { button.label = label.value; });
        icon.addEventListener('input', () => { button.icon = icon.value; });
        app.append(row);
      });
    }

    icons.forEach((icon) => {
      const option = document.createElement('option');
      option.value = icon;
      document.getElementById('icon-options').append(option);
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
        message.textContent = '已保存；重载窗口后更新右上角按钮';
      }
    });
    render();
  </script>
</body>
</html>`
}

export function deactivate() {}
