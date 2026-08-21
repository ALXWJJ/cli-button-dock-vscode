import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"

type ButtonIcon = string | { light: string; dark: string }

type ButtonConfig = {
  id: string
  title: string
  icon?: ButtonIcon
  command: string
  terminalName?: string
  reuseTerminal?: boolean
  runOnReuse?: boolean
  cwd?: "workspace" | "file"
  context?: "none" | "opencode"
  keybinding?: string
}

type ButtonFile = {
  buttons: ButtonConfig[]
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

const OPENCODE_PORT_ENV = "_EXTENSION_OPENCODE_PORT"

export function activate(context: vscode.ExtensionContext) {
  let buttons: ButtonConfig[]
  try {
    buttons = loadButtons(context)
  } catch (error) {
    vscode.window.showErrorMessage(`Could not load buttons.json: ${String(error)}`)
    buttons = []
  }

  for (const button of buttons) {
    const disposable = vscode.commands.registerCommand(`opencode.button.${button.id}`, async () => {
      await runButton(button, context)
    })
    context.subscriptions.push(disposable)
  }

  const addFilepathDisposable = vscode.commands.registerCommand("opencode.addFilepathToTerminal", async () => {
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

  async function runButton(button: ButtonConfig, extensionContext: vscode.ExtensionContext) {
    const activeContext = getActiveContext()
    const terminalName = button.terminalName ?? button.title
    const existingTerminal = button.reuseTerminal === false
      ? undefined
      : vscode.window.terminals.find((terminal) => terminal.name === terminalName)

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
      iconPath: getTerminalIcon(button.icon, extensionContext),
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

    const connected = await waitForOpenCode(port)
    if (connected) {
      await appendPrompt(port, `In ${activeContext.fileRef}`)
      terminal.show()
    }
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

  function loadButtons(extensionContext: vscode.ExtensionContext): ButtonConfig[] {
    const file = extensionContext.asAbsolutePath("buttons.json")
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as ButtonFile
    if (!Array.isArray(parsed.buttons)) {
      throw new Error("buttons must be an array")
    }
    return parsed.buttons
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

    // Check if there's a selection and add line numbers
    if (fileRef && !selection.isEmpty) {
      if (lineStart === lineEnd) {
        fileRef += `#L${lineStart}`
      } else {
        fileRef += `#L${lineStart}-${lineEnd}`
      }
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

  function getWorkingDirectory(button: ButtonConfig, activeContext: ActiveContext) {
    if (button.cwd === "file" && activeContext.file) {
      return path.dirname(activeContext.file)
    }
    return activeContext.workspaceFolder
  }

  function getTerminalIcon(icon: ButtonIcon | undefined, extensionContext: vscode.ExtensionContext) {
    if (!icon) {
      return undefined
    }
    if (typeof icon === "string") {
      const match = icon.match(/^\$\(([^)]+)\)$/)
      return match ? new vscode.ThemeIcon(match[1]) : undefined
    }
    return {
      light: vscode.Uri.file(extensionContext.asAbsolutePath(icon.light)),
      dark: vscode.Uri.file(extensionContext.asAbsolutePath(icon.dark)),
    }
  }

  function getRandomPort() {
    return Math.floor(Math.random() * (65535 - 16384 + 1)) + 16384
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
}

// This method is called when your extension is deactivated.
export function deactivate() {}
