# 发布到 VS Code 扩展市场

扩展 ID：`ALXWJJ.cli-button-dock`  
Publisher：`ALXWJJ`  
仓库：`https://github.com/ALXWJJ/cli-button-dock-vscode`

## 推荐：GitHub Actions 自动发布

工作流：`.github/workflows/publish.yml`

### 触发方式

1. **打 tag 推送**（常规发版）  
   `package.json` 里的 `version` 必须与 tag 一致（去掉前缀 `v`）：

   ```bash
   # 例如 version 为 0.1.5
   git tag v0.1.5
   git push origin v0.1.5
   ```

2. **手动运行**  
   GitHub → **Actions** → **Publish extension** → **Run workflow**  
   可选认证方式：`pat` 或 `oidc`。

---

### 方式 A：PAT（`VSCE_PAT`）

适合先跑通流程；2026-12-01 后 Azure DevOps 全局 PAT 会退役，长期建议改用方式 B。

#### 1. 创建 Azure DevOps 组织（PAT 404 时必做）

1. 打开 [dev.azure.com](https://dev.azure.com) 登录  
2. **Start free** → 创建组织（例如 `ALXWJJ`）  
3. 进入组织后：头像 → **Personal access tokens**  
   地址：`https://dev.azure.com/<组织名>/_usersSettings/tokens`

#### 2. 创建 PAT

- Organization：**All accessible organizations**  
- Scopes：**Custom defined** → **Marketplace → Manage**

#### 3. 写入 GitHub Secret

仓库 **Settings → Secrets and variables → Actions → New repository secret**：

| Name | Value |
|------|--------|
| `VSCE_PAT` | 上一步复制的 PAT |

#### 4. 确保 Marketplace Publisher 已创建

[Marketplace 管理页](https://marketplace.visualstudio.com/manage) → Publisher **`ALXWJJ`**（与 `package.json` 的 `publisher` 一致）。

#### 5. 发版

```bash
git tag v0.1.5
git push origin v0.1.5
```

在 **Actions** 里查看 **Publish extension** 是否成功。

---

### 方式 B：OIDC（无需 PAT，`vsce publish --oidc`）

在 Marketplace 为 Publisher 配置 **Trusted Publishing**（仓库 + workflow），然后：

1. 仓库 **Settings → Secrets and variables → Actions → Variables**  
   新建 **`USE_OIDC_PUBLISH`** = **`true`**
2. 手动触发时选 **oidc**，或 tag 推送会自动走 OIDC（当变量为 `true` 时）
3. Workflow 已包含 `permissions: id-token: write`

配置入口（Publisher 已创建后）：

[Marketplace 管理页](https://marketplace.visualstudio.com/manage) → **ALXWJJ** → **Security** → Trusted publishing / OIDC 相关设置

- Repository：`ALXWJJ/cli-button-dock-vscode`  
- Workflow：`publish.yml`（或 `Publish extension`）

若 Marketplace 尚未提供 UI，可参考 [vsmarketplace#1422](https://github.com/microsoft/vsmarketplace/issues/1422) 用 Entra Managed Identity + `azure/login` + `vsce publish --azure-credential`（需 Azure 订阅）。

---

## 本地打包 / 手动上传（不上 CI）

```bash
bun run vsix
```

得到 `cli-button-dock-*.vsix`。  
[Marketplace 管理页](https://marketplace.visualstudio.com/manage) → **+ New extension** → **Visual Studio Code** → 上传 VSIX。

本地安装：

```bash
code --install-extension ./cli-button-dock-*.vsix --force
```

## 上架后

- 链接：https://marketplace.visualstudio.com/items?itemName=ALXWJJ.cli-button-dock  
- 安装：`code --install-extension ALXWJJ.cli-button-dock`

## 更新版本 checklist

1. 修改 `package.json` 的 `version`  
2. 提交并 push  
3. `git tag v<version>` && `git push origin v<version>`  
4. 确认 Actions 发布成功
