# opencode Custom Buttons

An opinionated fork of the official opencode VS Code extension with configurable editor-title buttons for opencode, Codex, or any other CLI command.

## Configure buttons

Edit [`buttons.json`](./buttons.json). Each entry creates one button in the editor title bar:

```json
{
  "id": "review",
  "title": "Review with Codex",
  "icon": "$(check-all)",
  "command": "codex review {{fileRef}}",
  "terminalName": "Codex Review",
  "reuseTerminal": false,
  "cwd": "workspace"
}
```

`icon` accepts a VS Code Codicon such as `$(terminal)` or a light/dark SVG object:

```json
"icon": {
  "light": "images/review-light.svg",
  "dark": "images/review-dark.svg"
}
```

Supported command variables are `{{workspaceFolder}}`, `{{file}}`, `{{relativeFile}}`, `{{fileRef}}`, `{{selection}}`, `{{lineStart}}`, `{{lineEnd}}`, and `{{port}}`. The `opencode` context mode starts the CLI on a local port and sends the active file reference through the OpenCode TUI API.

The editor title bar is declared statically by VS Code, so changing button labels or icons requires rebuilding the extension. Run `bun run compile` after editing `buttons.json`; the build regenerates `package.json` automatically.

## Development

1. Open this directory in VS Code: `code sdks/vscode`.
2. Run `bun install`.
3. Run `bun run compile`.
4. Press `F5` to start an Extension Development Host.

The generated extension is `dist/extension.js`. The repository is forked at [github.com/ALXWJJ/opencode](https://github.com/ALXWJJ/opencode), while the official repository remains the `upstream` remote.
