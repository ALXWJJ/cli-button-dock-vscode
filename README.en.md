# Cli Button Dock

[中文](README.md)

Up to 10 editor title-bar buttons to launch OpenCode, Codex, Claude Code, Gemini CLI, Qwen Code, Cursor CLI, OpenClaw, MiMo Code, Antigravity, and 18 preset CLI agents—or any custom command—in a new integrated terminal.

Settings use `cliButtonDock.*`.

## Quick start

1. Click the **Cli Button Dock icon** at the right of the editor title bar (**Configure Cli Button Dock**) to open the configurator
2. Enable the buttons you want, pick a preset or enter command, label, and icon
3. Click **Save and Reload Window** — the buttons appear in the title bar

Each click opens a **new terminal** and runs the command.

## Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Open configurator | `Cmd/Ctrl+Alt+A` |
| Insert active file reference into terminal | `Cmd/Ctrl+Alt+K` |

## Install

Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ALXWJJ.cli-button-dock), search **Cli Button Dock** in the Extensions view, or:

```bash
code --install-extension ALXWJJ.cli-button-dock
```

Requires VS Code ≥ 1.94.

## Advanced settings

The UI edits `enabled`, `preset`, `label`, `icon`, and `command`.

Edit `cwd` and more in `cliButtonDock.buttons` inside `settings.json`. Commands support `{{file}}`, `{{fileRef}}`, `{{selection}}`, and other variables.

## Development

Requires [Bun](https://bun.sh/) ≥ 1.3.

```bash
bun run check
bun run package
```

Publishing: see [docs/PUBLISHING.md](docs/PUBLISHING.md) (GitHub Actions OIDC).

## License

MIT. Independent community project, not affiliated with agent vendors.
