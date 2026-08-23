# GitHub Actions OIDC 发布（无需 PAT）

Marketplace 底层仍是微软账号体系，但 **不用 dev.azure.com 的 PAT**。  
流程是：GitHub Actions 用 OIDC 登录 **Entra（Azure AD）应用** → `vsce publish --azure-credential`。

> 说明：当前发布的 `@vscode/vsce@3.9.2` **没有** `--oidc` 命令行参数；OIDC 走 `azure/login` + `--azure-credential`。

## 前置

- [Marketplace Publisher](https://marketplace.visualstudio.com/manage) **`ALXWJJ`** 已创建  
- 本仓库已配置 GitHub Environment **`marketplace`**（已创建）  
- 仓库变量 **`USE_OIDC_PUBLISH=true`**（已设置）

## 第一步：Entra 应用 + 联合凭据

1. 打开 [Azure 门户 → 应用注册](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)（用 Microsoft 账号登录即可，**不必**有 Azure 订阅）  
2. **新注册**  
   - 名称：例如 `cli-button-dock-publish`  
   - 账户类型：单租户即可  
3. 记下 **应用程序(客户端) ID** 和 **目录(租户) ID**  
4. **证书和密码 → 联合凭据 → 添加凭据**  
   - 场景：**GitHub Actions 部署 Azure 资源**  
   - Organization：`ALXWJJ`  
   - Repository：`cli-button-dock-vscode`  
   - Entity type：**Environment**  
   - Environment name：`marketplace`（须与 workflow 里 `environment: marketplace` 一致）  
5. 保存后，联合主体应类似：  
   `repo:ALXWJJ/cli-button-dock-vscode:environment:marketplace`

## 第二步：GitHub Environment 变量

仓库 **Settings → Environments → marketplace → Environment variables**：

| Name | Value |
|------|--------|
| `AZURE_CLIENT_ID` | 应用的客户端 ID |
| `AZURE_TENANT_ID` | 租户 ID |

（这两个不是秘密，放在 Variables 即可。）

## 第三步：把 Entra 应用加进 Publisher 成员

### 3a. 查 Marketplace 身份 ID

1. **Actions → Marketplace identity probe → Run workflow**  
2. 若 Azure 登录成功，日志里 JSON 的 **`id`** 字段（形如 `a1b2c3d4-...`）就是 Marketplace 成员 ID  

若此步失败，多半是联合凭据的 repo/environment 与 GitHub 不一致。

### 3b. 在 Marketplace 添加成员

1. [manage/publishers/ALXWJJ](https://marketplace.visualstudio.com/manage/publishers/ALXWJJ)  
2. **Members → Add**  
3. 填入上一步的 **`id`**  
4. 角色：**Creator** 或 **Contributor**

## 第四步：发布

**手动试跑（推荐第一次）：**

Actions → **Publish extension** → Run workflow → auth 选 **oidc**

**正式发版：**

```bash
# package.json version 须与 tag 一致
git tag v0.1.5
git push origin v0.1.5
```

## 故障排查

| 现象 | 常见原因 |
|------|----------|
| Azure login 失败 | 联合凭据的 org/repo/environment 与 GitHub 不一致 |
| `AZURE_CLIENT_ID` 为空 | Environment variables 设在 repo 级而非 `marketplace` environment |
| 403 / corporate credentials | Entra 应用未加入 Publisher Members，或角色不够 |
| 版本已存在 | 提高 `package.json` version 后重新打 tag |

## 相关文件

- `.github/workflows/publish.yml` — 发布  
- `.github/workflows/marketplace-identity.yml` — 一次性查身份 ID  

更通用的说明见 [PUBLISHING.md](./PUBLISHING.md)。
