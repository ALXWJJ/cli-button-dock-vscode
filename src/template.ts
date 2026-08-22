import type { ActiveContext } from "./types"

export function expandCommand(command: string, activeContext: ActiveContext) {
  const values: Record<string, string> = {
    workspaceFolder: activeContext.workspaceFolder ?? "",
    file: activeContext.file ?? "",
    relativeFile: activeContext.relativeFile ?? "",
    fileRef: activeContext.fileRef ?? "",
    selection: activeContext.selection ?? "",
    lineStart: activeContext.lineStart ?? "",
    lineEnd: activeContext.lineEnd ?? "",
  }

  return command.replace(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}|\$\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, curlyName, dollarName) => {
    const name = curlyName ?? dollarName
    return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match
  })
}
