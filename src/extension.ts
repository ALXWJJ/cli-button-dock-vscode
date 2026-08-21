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
type ButtonCwd = "workspace" | "file"
type ButtonIcon = string

type ButtonConfig = {
  id: string
  enabled: boolean
  label: string
  icon: ButtonIcon
  command: string
  terminalName: string
  reuseTerminal: boolean
  runOnReuse: boolean
  cwd: ButtonCwd
  context: ButtonContext
}

type AgentPreset = Omit<ButtonConfig, "id" | "enabled">

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

const AGENT_PRESETS: Array<AgentPreset & { id: string; name: string }> = [
  {
    id: "opencode",
    name: "OpenCode",
    label: "Open opencode",
    icon: "sparkle",
    command: "opencode --port {{port}}",
    terminalName: "opencode",
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "opencode",
  },
  {
    id: "codex",
    name: "Codex CLI",
    label: "Open Codex",
    icon: "hubot",
    command: "codex",
    terminalName: "Codex",
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "none",
  },
  {
    id: "claude",
    name: "Claude Code",
    label: "Open Claude Code",
    icon: "comment-discussion",
    command: "claude",
    terminalName: "Claude Code",
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "none",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    label: "Open Gemini CLI",
    icon: "sparkle",
    command: "gemini",
    terminalName: "Gemini CLI",
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "none",
  },
  {
    id: "aider",
    name: "Aider",
    label: "Open Aider",
    icon: "code",
    command: "aider",
    terminalName: "Aider",
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "none",
  },
  {
    id: "goose",
    name: "Goose",
    label: "Open Goose",
    icon: "rocket",
    command: "goose",
    terminalName: "Goose",
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "none",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    label: "Open Qwen Code",
    icon: "lightbulb",
    command: "qwen",
    terminalName: "Qwen Code",
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "none",
  },
]

const DEFAULT_BUTTONS: ButtonConfig[] = [
  createButton("01", AGENT_PRESETS[0], true),
  createButton("02", AGENT_PRESETS[1], true),
  createButton("03", AGENT_PRESETS[2], false),
  createButton("04", AGENT_PRESETS[3], false),
  createButton("05", AGENT_PRESETS[4], false),
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

function createButton(id: string, preset: AgentPreset, enabled: boolean): ButtonConfig {
  return {
    id,
    enabled,
    label: preset.label,
    icon: preset.icon,
    command: preset.command,
    terminalName: preset.terminalName,
    reuseTerminal: preset.reuseTerminal,
    runOnReuse: preset.runOnReuse,
    cwd: preset.cwd,
    context: preset.context,
  }
}

function emptyPreset(label: string): AgentPreset {
  return {
    label,
    icon: "terminal",
    command: "",
    terminalName: label,
    reuseTerminal: true,
    runOnReuse: false,
    cwd: "workspace",
    context: "none",
  }
}

function loadButtons(): ButtonConfig[] {
  const configured = vscode.workspace.getConfiguration(CONFIGURATION_SECTION).get<unknown>(CONFIGURATION_KEY)
  const entries = Array.isArray(configured) ? configured : []
  return BUTTON_IDS.map((id, index) => normalizeButton(entries[index], DEFAULT_BUTTONS[index], id))
}

function normalizeButtons(value: unknown): ButtonConfig[] {
  const entries = Array.isArray(value) ? value : []
  return BUTTON_IDS.map((id, index) => normalizeButton(entries[index], DEFAULT_BUTTONS[index], id))
}

function normalizeButton(value: unknown, fallback: ButtonConfig, id: string): ButtonConfig {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const context = record.context === "opencode" ? "opencode" : fallback.context
  const cwd = record.cwd === "file" ? "file" : fallback.cwd
  return {
    id,
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : fallback.label,
    icon: normalizeIcon(typeof record.icon === "string" ? record.icon : fallback.icon),
    command: typeof record.command === "string" ? record.command : fallback.command,
    terminalName: typeof record.terminalName === "string" && record.terminalName.trim()
      ? record.terminalName.trim()
      : fallback.terminalName,
    reuseTerminal: typeof record.reuseTerminal === "boolean" ? record.reuseTerminal : fallback.reuseTerminal,
    runOnReuse: typeof record.runOnReuse === "boolean" ? record.runOnReuse : fallback.runOnReuse,
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
  const terminalName = button.terminalName || button.label
  const existingTerminal = button.reuseTerminal
    ? vscode.window.terminals.find((terminal) => terminal.name === terminalName)
    : undefined

  if (existingTerminal) {
    existingTerminal.show()
    if (button.runOnReuse) {
      existingTerminal.sendText(expandCommand(button.command, activeContext), true)
    }
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
  return activeContext.workspaceFolder
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
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); padding: 24px; max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .hint { color: var(--vscode-descriptionForeground); margin: 0 0 20px; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 16px; position: sticky; top: 0; padding: 8px 0; background: var(--vscode-editor-background); z-index: 2; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 7px 14px; cursor: pointer; border-radius: 2px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    #message { color: var(--vscode-testing-iconPassed); min-height: 20px; margin-left: 8px; align-self: center; }
    .button-card { border: 1px solid var(--vscode-panel-border); padding: 14px; margin: 10px 0; border-radius: 4px; }
    .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .slot { font-weight: 600; min-width: 58px; }
    .enabled { width: 16px; height: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 10px 16px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field.wide { grid-column: 1 / -1; }
    label { color: var(--vscode-descriptionForeground); font-size: 12px; }
    input, select, textarea { color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); padding: 6px 8px; font: inherit; }
    textarea { min-height: 52px; resize: vertical; }
    .checks { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; }
    .check { display: flex; flex-direction: row; align-items: center; gap: 6px; }
    .check label { color: var(--vscode-foreground); }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } .field.wide { grid-column: auto; } }
  </style>
</head>
<body>
  <h1>Agent Action Dock</h1>
  <p class="hint">配置编辑器右上角的 Agent / CLI 按钮。命令支持 {{workspaceFolder}}、{{file}}、{{relativeFile}}、{{fileRef}}、{{selection}}、{{lineStart}}、{{lineEnd}} 和 {{port}}。</p>
  <div class="toolbar">
    <button id="save">保存配置</button>
    <button id="reset">恢复默认</button>
    <span id="message"></span>
  </div>
  <datalist id="icon-options"></datalist>
  <main id="app"></main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = ${state};
    const presets = ${presets};
    const icons = ${icons};
    const app = document.getElementById('app');
    const message = document.getElementById('message');

    function field(card, title, control, wide) {
      const wrapper = document.createElement('div');
      wrapper.className = wide ? 'field wide' : 'field';
      const label = document.createElement('label');
      label.textContent = title;
      wrapper.append(label, control);
      card.querySelector('.grid').append(wrapper);
    }

    function textInput(className, value) {
      const input = document.createElement('input');
      input.className = className;
      input.value = value || '';
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

    function render() {
      app.replaceChildren();
      state.forEach((button) => {
        const card = document.createElement('section');
        card.className = 'button-card';
        card.dataset.id = button.id;
        const header = document.createElement('div');
        header.className = 'card-header';
        const enabled = document.createElement('input');
        enabled.type = 'checkbox';
        enabled.className = 'enabled';
        enabled.checked = !!button.enabled;
        const slot = document.createElement('span');
        slot.className = 'slot';
        slot.textContent = '按钮 ' + button.id;
        const heading = document.createElement('strong');
        heading.textContent = button.label || ('Agent ' + button.id);
        header.append(enabled, slot, heading);
        card.append(header);

        const grid = document.createElement('div');
        grid.className = 'grid';
        card.append(grid);

        const presetOptions = [{ value: '', label: '自定义' }].concat(presets.map((preset) => ({ value: preset.id, label: preset.name })));
        const preset = selectInput('preset', presetOptions, '');
        field(card, '预设', preset, false);
        const label = textInput('label', button.label);
        field(card, '按钮名称', label, false);
        const icon = textInput('icon', button.icon);
        icon.setAttribute('list', 'icon-options');
        field(card, '图标 Codicon', icon, false);
        const terminalName = textInput('terminalName', button.terminalName);
        field(card, '终端名称', terminalName, false);
        const cwd = selectInput('cwd', [{ value: 'workspace', label: '工作区根目录' }, { value: 'file', label: '当前文件所在目录' }], button.cwd);
        field(card, '工作目录', cwd, false);
        const context = selectInput('context', [{ value: 'none', label: '不注入文件上下文' }, { value: 'opencode', label: 'OpenCode 文件上下文' }], button.context);
        field(card, '上下文模式', context, false);
        const command = document.createElement('textarea');
        command.className = 'command';
        command.value = button.command || '';
        field(card, '执行命令', command, true);

        const checks = document.createElement('div');
        checks.className = 'checks';
        const reuse = document.createElement('input');
        reuse.type = 'checkbox';
        reuse.className = 'reuseTerminal';
        reuse.checked = button.reuseTerminal !== false;
        const reuseLabel = document.createElement('label');
        reuseLabel.textContent = '复用同名终端';
        const reuseWrap = document.createElement('span');
        reuseWrap.className = 'check';
        reuseWrap.append(reuse, reuseLabel);
        const runOnReuse = document.createElement('input');
        runOnReuse.type = 'checkbox';
        runOnReuse.className = 'runOnReuse';
        runOnReuse.checked = !!button.runOnReuse;
        const runLabel = document.createElement('label');
        runLabel.textContent = '复用时再次执行命令';
        const runWrap = document.createElement('span');
        runWrap.className = 'check';
        runWrap.append(runOnReuse, runLabel);
        checks.append(reuseWrap, runWrap);
        card.append(checks);

        preset.addEventListener('change', () => {
          const selected = presets.find((item) => item.id === preset.value);
          if (!selected) return;
          label.value = selected.label;
          icon.value = selected.icon;
          command.value = selected.command;
          terminalName.value = selected.terminalName;
          cwd.value = selected.cwd;
          context.value = selected.context;
          reuse.checked = selected.reuseTerminal;
          runOnReuse.checked = selected.runOnReuse;
          heading.textContent = selected.label;
        });
        label.addEventListener('input', () => { heading.textContent = label.value || ('Agent ' + button.id); });
        app.append(card);
      });
    }

    icons.forEach((icon) => {
      const option = document.createElement('option');
      option.value = icon;
      document.getElementById('icon-options').append(option);
    });

    document.getElementById('save').addEventListener('click', () => {
      const next = Array.from(document.querySelectorAll('.button-card')).map((card) => ({
        id: card.dataset.id,
        enabled: card.querySelector('.enabled').checked,
        label: card.querySelector('.label').value,
        icon: card.querySelector('.icon').value,
        command: card.querySelector('.command').value,
        terminalName: card.querySelector('.terminalName').value,
        reuseTerminal: card.querySelector('.reuseTerminal').checked,
        runOnReuse: card.querySelector('.runOnReuse').checked,
        cwd: card.querySelector('.cwd').value,
        context: card.querySelector('.context').value
      }));
      vscode.postMessage({ type: 'save', buttons: next });
    });

    document.getElementById('reset').addEventListener('click', () => vscode.postMessage({ type: 'reset' }));
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data.type === 'config') {
        state = data.buttons;
        render();
        message.textContent = '已恢复默认配置';
      } else if (data.type === 'saved') {
        state = data.buttons || state;
        message.textContent = '已保存；按钮外观将在重载窗口后更新';
      }
    });
    render();
  </script>
</body>
</html>`
}

export function deactivate() {}
