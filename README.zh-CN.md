# Agent Action Dock

[English](README.md)

Agent Action Dock 是一个轻量的 VS Code 扩展，可以把命令行编码 Agent
放到编辑器标题栏，通过按钮快速启动。你可以为 OpenCode、Codex、Claude
Code、Gemini CLI、Aider、Goose、Qwen Code、Pi Agent、DeepSeek、ZCode、
Kimi Code 或任意其他命令行工具配置最多 10 个按钮。

仓库名称是 `cli-button-dock-vscode`；扩展显示名称以及
`agentActionDock.*` 配置和命令标识保持不变，以兼容已有设置。

## 功能

- 在编辑器标题栏配置最多 10 个按钮。
- 默认只启用 OpenCode 按钮，其他位置可以按需开启。
- 通过命令面板、标题栏或 `Cmd/Ctrl+Alt+A` 打开图形化配置页面。
- 内置常用编码 Agent 预设，也支持完全自定义命令。
- 提供 Agent 品牌图标和一组精选可爱 Emoji 图标，默认图标是 👻（U+1F47B）。
- 不上传文件即可自定义图标：支持内联 SVG、`data:image/...` 和 HTTPS 图片链接。
- 提供自定义图标交互面板：用 Lucide 图片图标编辑 SVG、用 Lucide 链接图标设置 HTTPS 图片链接，并实时预览。
- 配置页提供 **保存并重载窗口** 按钮。
- 每次点击按钮都会打开一个新的集成终端。
- 可选择终端工作目录：当前目录、工作区目录或当前文件目录。
- 支持在命令中展开工作区、文件、选区和行号变量。
- 配置页和命令标题支持 11 种语言：英语、简体中文、繁体中文、日语、韩语、德语、法语、西班牙语、巴西葡萄牙语、俄语和意大利语。
- 支持把当前文件引用插入当前活动终端。

## 安装

目前项目以源码和 VSIX 形式分发。

环境要求：

- VS Code 1.94 或更高版本
- [Bun](https://bun.sh/) 1.3 或更高版本

从源码构建并安装：

```bash
git clone https://github.com/ALXWJJ/cli-button-dock-vscode.git
cd cli-button-dock-vscode
bun install
bun run package
bun x @vscode/vsce package --no-dependencies
code --install-extension ./agent-action-dock-0.1.4.vsix
```

生成的 VSIX 文件名会包含 `package.json` 中的版本号。也可以在 VS Code
中运行 **Extensions: Install from VSIX...** 安装。

## 使用

1. 打开命令面板。
2. 执行 **Agent Action Dock: Configure Buttons**（中文环境下为 **Agent Action Dock: 配置按钮**）。
3. 启用按钮，选择预设或填写自定义命令，然后保存。
4. 点击 **保存并重载窗口** 以应用标题栏变更。

也可以点击编辑器标题栏中的设置齿轮，或右键标题栏打开配置页面。默认
快捷键如下：

| 操作 | macOS | Windows/Linux |
| --- | --- | --- |
| 配置按钮 | `Cmd+Alt+A` | `Ctrl+Alt+A` |
| 将当前文件加入终端 | `Cmd+Alt+K` | `Ctrl+Alt+K` |

每次点击标题栏按钮都会新建一个集成终端，并在其中执行配置的命令。

## 配置

图形化编辑器会把按钮列表写入用户设置，并提供 `enabled`、`preset`、
`label`、`icon`、`command` 的可视化编辑。

`cwd` 和 `context` 等高级字段不在图形化页面中展示，请直接在
`settings.json` 中编辑：

```json
{
  "agentActionDock.buttons": [
    {
      "id": "01",
      "enabled": true,
      "preset": "custom",
      "label": "我的 Agent",
      "icon": "terminal",
      "command": "my-agent --file {{fileRef}}",
      "cwd": "current",
      "context": "none"
    }
  ]
}
```

### 按钮字段

- `enabled`：是否在编辑器标题栏显示按钮。
- `label`：按钮名称，同时也是集成终端名称。
- `preset`：内置预设 ID，或使用 `custom`。
- `icon`：可以是 `emoji:👻` 这样的 Emoji ID、`brand:codex` 这样的品牌图标
  ID，也可以是内联 SVG、`data:image/...` 或 `https://...` 图片链接。手动写入
  settings.json 的旧 Codicon ID 仍然兼容，但图形化选择器不再提供 Codicon。
- `command`：发送给集成终端的命令。
- `cwd`：`current`、`workspace` 或 `file`。请在 `settings.json` 中编辑。
- `context`：保留的兼容字段，已不再改变运行时行为。如需保留旧配置可继续在
  `settings.json` 中填写。

命令支持 `{{name}}` 和 `${name}` 两种变量写法：

| 变量 | 展开内容 |
| --- | --- |
| `workspaceFolder` | 当前工作区目录的绝对路径 |
| `file` | 当前文件的绝对路径 |
| `relativeFile` | 当前文件相对于工作区的路径 |
| `fileRef` | 文件引用，例如 `@src/index.ts#L10-L12` |
| `selection` | 当前编辑器选中的文本 |
| `lineStart` | 当前选区的起始行号，从 1 开始 |
| `lineEnd` | 当前选区的结束行号，从 1 开始 |

未知变量会保持原样。如果没有活动编辑器上下文，文件和选区变量会展开
为空字符串。

### 自定义图标

自定义图标不需要上传文件。在 `icon` 中填写以下任意一种形式即可：

```json
{
  "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"...\"/></svg>"
}
```

也可以填写 `data:image/svg+xml,...`、`data:image/png;base64,...`，或者
HTTPS 图片链接。由于 VS Code 的命令图标需要扩展本地图片路径，扩展会把
HTTPS 图片下载并缓存到本地插件目录的 `media/user-icons` 下，再更新标题栏
按钮。图形化配置页不再放置图标文本输入框：点击图标旁边的 Lucide 图片图标可
编辑 SVG，点击 Lucide 链接图标可设置图片链接，输入内容后实时预览并点击“应用图标”。SVG 内容
会经过清理，单个图标限制为 1 MiB。不支持 HTTP 链接和不支持的图片类型；自定义
图标加载失败时会回退为 👻。请使用 **保存并重载窗口** 应用标题栏图标变化。

## 开发

```bash
bun install
bun run check       # TypeScript 类型检查、ESLint 和单元测试
bun run compile     # 开发构建
bun run package     # 生产构建
bun run test        # 仅运行单元测试
bun run format      # 应用 ESLint 修复
```

用 VS Code 打开仓库后按 `F5`，即可启动 Extension Development Host。
开发扩展 bundle 时，也可以运行 `bun run watch:esbuild`。

CI 会在 push 和 pull request 时运行类型检查、Lint、单元测试和构建检查。

## 项目结构

```text
src/                   扩展源码模块
test/                  纯函数单元测试
media/brands/          内置且统一画布尺寸的 Agent 品牌资源
images/icon.png        扩展图标
esbuild.js             扩展打包配置
package.nls*.json      扩展清单的本地化字符串
package.json           VS Code 扩展清单和开发脚本
```

## 安全和隐私

命令会以当前用户权限在 VS Code 集成终端中执行。扩展不会沙箱化或改写
命令，因此启用按钮前请检查配置。对于 HTTPS 自定义图标链接，扩展会访问
该地址并缓存图片；使用前请确认图片来源可信。扩展不会上传源文件，也不会
收集遥测数据。

## 参与贡献

欢迎提交 Bug、功能建议、文档改进和 Pull Request。提交修改前请先阅读
[CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证和第三方声明

本项目使用 [MIT License](LICENSE)。项目内置了多个 Agent 品牌资源。版权
归属、来源链接和商标说明请参阅 [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)。

Agent Action Dock 是独立的社区项目，与 Microsoft、OpenCode、OpenAI、
Anthropic、Google、Aider、Goose、Qwen、DeepSeek、Z.ai、Moonshot AI 或
预设中提到的其他 Agent 厂商没有隶属、赞助或官方合作关系。
