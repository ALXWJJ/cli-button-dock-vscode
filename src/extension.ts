import * as vscode from "vscode"
import { BUTTON_IDS } from "./constants"
import {
  loadButtons,
  saveButtons,
  updateButtonContexts,
} from "./config"
import { openConfigurator } from "./configurator"
import { tManifestChanged, tManifestMetadataChanged } from "./l10n"
import { syncManifest } from "./manifest"
import { addFilepathToActiveTerminal, runButton } from "./terminal"

export function activate(context: vscode.ExtensionContext) {
  let buttons = loadButtons()

  void updateButtonContexts(buttons)
  void syncManifest(context, buttons).then((changed) => {
    if (changed) {
      vscode.window.showInformationMessage(tManifestMetadataChanged())
    }
  })

  for (const buttonId of BUTTON_IDS) {
    const disposable = vscode.commands.registerCommand(`cliButtonDock.button${buttonId}`, async () => {
      const button = buttons.find((item) => item.id === buttonId)
      if (button) {
        await runButton(button, context)
      }
    })
    context.subscriptions.push(disposable)
  }

  const configureDisposable = vscode.commands.registerCommand("cliButtonDock.configure", () => {
    openConfigurator(context, buttons, async (nextButtons) => {
      buttons = nextButtons
      await updateButtonContexts(nextButtons)
      await saveButtons(nextButtons)
    })
  })
  context.subscriptions.push(configureDisposable)

  const addFilepathDisposable = vscode.commands.registerCommand("cliButtonDock.addFilepathToTerminal", async () => {
    await addFilepathToActiveTerminal()
  })
  context.subscriptions.push(addFilepathDisposable)

  const configurationDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration("cliButtonDock.buttons")) {
      return
    }

    buttons = loadButtons()
    void updateButtonContexts(buttons)
    void syncManifest(context, buttons).then((changed) => {
      if (changed) {
        vscode.window.showInformationMessage(tManifestChanged())
      }
    })
  })
  context.subscriptions.push(configurationDisposable)
}

export function deactivate() {}
