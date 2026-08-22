import * as path from "node:path"
import * as vscode from "vscode"
import { getTerminalIconPath } from "./icons"
import { tConfigureCommandFirst } from "./l10n"
import { expandCommand } from "./template"
import type { ActiveContext, ButtonConfig } from "./types"

export function getActiveContext(): ActiveContext {
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

function getWorkingDirectory(button: ButtonConfig, activeContext: ActiveContext) {
  if (button.cwd === "file" && activeContext.file) {
    return path.dirname(activeContext.file)
  }
  if (button.cwd === "workspace") {
    return activeContext.workspaceFolder
  }
  return undefined
}

export async function runButton(button: ButtonConfig, extensionContext: vscode.ExtensionContext) {
  if (!button.command.trim()) {
    vscode.window.showWarningMessage(tConfigureCommandFirst(button.label))
    return
  }

  const activeContext = getActiveContext()
  const terminal = vscode.window.createTerminal({
    name: button.label,
    cwd: getWorkingDirectory(button, activeContext),
    iconPath: await getTerminalIconPath(extensionContext, button.icon),
    location: {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: false,
    },
  })

  terminal.show()
  terminal.sendText(expandCommand(button.command, activeContext), true)
}

export async function addFilepathToActiveTerminal() {
  const fileRef = getActiveContext().fileRef
  const terminal = vscode.window.activeTerminal
  if (!fileRef || !terminal) {
    return
  }

  terminal.sendText(fileRef, false)
  terminal.show()
}
