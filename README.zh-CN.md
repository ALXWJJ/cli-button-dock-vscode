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
- 通过命令面板、标题栏或 `Cmd/Ctrl+Alt+A` 打开图形化配置页面。
- 内置常用编码 Agent 预设，也支持完全自定义命令。
- 提供 Agent 品牌图标和可搜索的官方 VS Code Codicon 图标网格。
- 按钮名称对应集成终端名称，并自动复用同名终端。
- 可选择终端工作目录：当前目录、工作区目录或当前文件目录。
- 支持在命令中展开工作区、文件、选区、行号和端口变量。
- 可选的 OpenCode 文件上下文集成。
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
code --install-extension ./agent-action-dock-0.1.0.vsix
```

生成的 VSIX 文件名会包含 `package.json` 中的版本号。也可以在 VS Code
中运行 **Extensions: Install from VSIX...** 安装。

## 使用

1. 打开命令面板。
2. 执行 **Agent Action Dock: Configure Buttons**。
3. 启用按钮，选择预设或填写自定义命令，然后保存。
4. 根据提示重载 VS Code 窗口。

也可以点击编辑器标题栏中的设置齿轮，或右键标题栏打开配置页面。默认
快捷键如下：

| 操作 | macOS | Windows/Linux |
| --- | --- | --- |
| 配置按钮 | `Cmd+Alt+A` | `Ctrl+Alt+A` |
| 将当前文件加入终端 | `Cmd+Alt+K` | `Ctrl+Alt+K` |

扩展会复用同名的 VS Code 集成终端。如果已经存在同名终端，点击按钮只
会聚焦该终端，不会再次执行命令。

## 配置

图形化编辑器会把按钮列表写入用户设置。高级字段可以直接在
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
- `icon`：例如 `terminal` 这样的 Codicon ID，或 `brand:codex` 这样的
  品牌图标 ID。
- `command`：发送给集成终端的命令。
- `cwd`：`current`、`workspace` 或 `file`。
- `context`：`none` 或 `opencode`。

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
| `port` | OpenCode 集成使用的临时端口 |

未知变量会保持原样。如果没有活动编辑器上下文，文件和选区变量会展开
为空字符串。

### OpenCode 上下文

当按钮的 `context` 设置为 `"opencode"` 时，扩展会分配一个本地端口，
设置 OpenCode 需要的终端环境变量，并在启动后把当前文件引用发送到本地
OpenCode 接口。这是可选集成；普通命令使用 `context: "none"` 即可。

## 开发

```bash
bun install
bun run check       # TypeScript 类型检查和 ESLint
bun run compile     # 开发构建
bun run package     # 生产构建
bun run format      # 应用 ESLint 修复
```

用 VS Code 打开仓库后按 `F5`，即可启动 Extension Development Host。
开发扩展 bundle 时，也可以运行 `bun run watch:esbuild`。

当前项目还没有自动化集成测试套件。CI 会在 push 和 pull request 时运行
类型检查、Lint 和构建检查。

## 项目结构

```text
src/extension.ts       扩展激活、命令、终端处理、配置页面和清单同步
media/brands/          内置 Agent 品牌资源
media/codicon.*        内置 VS Code Codicon 字体和样式
images/icon.png        扩展图标
esbuild.js             扩展打包配置
package.json           VS Code 扩展清单和开发脚本
```

## 安全和隐私

命令会以当前用户权限在 VS Code 集成终端中执行。扩展不会沙箱化或改写
命令，因此启用按钮前请检查配置。扩展自身只会在可选的 OpenCode 上下文
集成功能中访问 `localhost`，不会上传源文件，也不会收集遥测数据。

## 参与贡献

欢迎提交 Bug、功能建议、文档改进和 Pull Request。提交修改前请先阅读
[CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证和第三方声明

本项目使用 [MIT License](LICENSE)。项目内置了 VS Code Codicons 字体、
样式表以及多个 Agent 品牌资源。版权归属、来源链接和商标说明请参阅
[THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)。

Agent Action Dock 是独立的社区项目，与 Microsoft、OpenCode、OpenAI、
Anthropic、Google、Aider、Goose、Qwen、DeepSeek、Z.ai、Moonshot AI 或
预设中提到的其他 Agent 厂商没有隶属、赞助或官方合作关系。
