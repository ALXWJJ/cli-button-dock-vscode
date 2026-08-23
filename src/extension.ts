import * as vscode from "vscode"
import { BUTTON_IDS } from "./constants"
import {
  loadButtons,
  saveButtons,
  updateButtonContexts,
} from "./config"
import { openConfigurator } from "./configurator"
import {
  faceCommandId,
  getTitleBarIconIds,
} from "./title-bar"
import { addFilepathToActiveTerminal, runButton } from "./terminal"

import type { ButtonConfig, ConfiguratorHandlers } from "./types"

async function applyButtonConfig(nextButtons: ButtonConfig[]) {
  await updateButtonContexts(nextButtons)
}

function registerButtonFaceCommands(
  context: vscode.ExtensionContext,
  getButtons: () => ButtonConfig[],
) {
  const iconIds = getTitleBarIconIds()

  for (const buttonId of BUTTON_IDS) {
    for (const iconId of iconIds) {
      const commandId = faceCommandId(buttonId, iconId)
      context.subscriptions.push(vscode.commands.registerCommand(commandId, async () => {
        const button = getButtons().find((item) => item.id === buttonId)
        if (button) {
          await runButton(button, context)
        }
      }))
    }

    const customCommandId = faceCommandId(buttonId, "https://custom")
    context.subscriptions.push(vscode.commands.registerCommand(customCommandId, async () => {
      const button = getButtons().find((item) => item.id === buttonId)
      if (button) {
        await runButton(button, context)
      }
    }))
  }
}

export function activate(context: vscode.ExtensionContext) {
  let buttons = loadButtons()

  void applyButtonConfig(buttons)
  registerButtonFaceCommands(context, () => buttons)

  const configureDisposable = vscode.commands.registerCommand("cliButtonDock.configure", () => {
    const handlers: ConfiguratorHandlers = {
      apply: async (nextButtons) => {
        buttons = nextButtons
        await saveButtons(nextButtons)
        await applyButtonConfig(nextButtons)
      },
    }
    openConfigurator(context, buttons, handlers)
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
    void applyButtonConfig(buttons)
  })
  context.subscriptions.push(configurationDisposable)
}

export function deactivate() {}
