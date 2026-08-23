import * as vscode from "vscode"
import { BUTTON_IDS, TITLE_BAR_RUNTIME_ICON_SLOTS } from "./constants"
import {
  loadButtons,
  saveButtons,
  updateButtonContexts,
} from "./config"
import { openConfigurator } from "./configurator"
import { syncTitleBarRuntimeIcons } from "./icons"
import {
  createRuntimeIconPlaceholders,
  customFaceCommandId,
  faceCommandId,
  getTitleBarIconIds,
} from "./title-bar"
import { addFilepathToActiveTerminal, runButton } from "./terminal"

import type { ButtonConfig, ConfiguratorHandlers } from "./types"

async function applyButtonConfig(context: vscode.ExtensionContext, nextButtons: ButtonConfig[]) {
  const { customIconSlots } = await syncTitleBarRuntimeIcons(context, nextButtons)
  await updateButtonContexts(nextButtons, customIconSlots)
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

    for (let slot = 0; slot < TITLE_BAR_RUNTIME_ICON_SLOTS; slot++) {
      const customCommandId = customFaceCommandId(buttonId, slot)
      context.subscriptions.push(vscode.commands.registerCommand(customCommandId, async () => {
        const button = getButtons().find((item) => item.id === buttonId)
        if (button) {
          await runButton(button, context)
        }
      }))
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  createRuntimeIconPlaceholders(context.extensionPath)
  let buttons = loadButtons()

  void applyButtonConfig(context, buttons)
  registerButtonFaceCommands(context, () => buttons)

  const configureDisposable = vscode.commands.registerCommand("cliButtonDock.configure", () => {
    const handlers: ConfiguratorHandlers = {
      apply: async (nextButtons) => {
        buttons = nextButtons
        await saveButtons(nextButtons)
        await applyButtonConfig(context, nextButtons)
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
    void applyButtonConfig(context, buttons)
  })
  context.subscriptions.push(configurationDisposable)
}

export function deactivate() {}
