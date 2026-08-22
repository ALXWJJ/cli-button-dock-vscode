# Contributing

Thank you for helping improve Agent Action Dock. Small fixes, documentation
updates, new presets, and focused feature changes are all welcome.

## Before you start

1. Search existing issues before opening a new one.
2. For a larger feature, open an issue first so the scope can be discussed.
3. Do not add credentials, private paths, generated bundles, `node_modules`,
   or VSIX files to a commit.

## Local setup

```bash
git clone https://github.com/ALXWJJ/cli-button-dock-vscode.git
cd cli-button-dock-vscode
bun install
```

Run the checks before submitting a pull request:

```bash
bun run check
bun run compile
```

`bun run check` runs TypeScript, ESLint, and the unit tests in `test/`.

Use `bun run format` for the repository's ESLint fixes. The extension can be
run in an Extension Development Host by opening the repository in VS Code and
pressing `F5`.

## Pull requests

- Keep each pull request focused on one change.
- Explain the user-visible behavior and any configuration changes.
- Update both `README.md` and `README.zh-CN.md` when documentation changes are
  user-facing.
- Add or update third-party attribution when adding an icon or other bundled
  asset.
- Include the commands you ran and their results in the pull request
  description.

## Code guidelines

- Keep command IDs and the `agentActionDock.*` configuration keys compatible
  unless a migration is included.
- Validate configuration loaded from `settings.json`; users may have older or
  partially configured values.
- Keep terminal commands explicit and avoid introducing hidden network calls.
- Prefer small, readable functions and keep the extension bundle free of
  unnecessary dependencies.

## Reporting security issues

Please do not publish sensitive details in a public issue. Contact the
repository owner through GitHub before disclosing a security-sensitive bug.
