# 南雍待办部署准备

当前版本的账号与任务由 **Supabase Auth + PostgreSQL** 维护。没有 Supabase 项目时，页面可以构建，但注册、登录和任务保存不能工作。请勿使用 service-role 密钥作为公开网站的环境变量。

1. 在 Supabase 创建一个新项目；记下 Project URL 与 `anon` / publishable key。SQL Editor 中运行 [`supabase/schema.sql`](supabase/schema.sql)。该脚本仅适用于**新项目**；已有数据的项目应先备份并核对表结构，不要直接重跑。
2. 在 Authentication → Providers 开启 Email。建议开启邮箱验证；在 URL Configuration 设置 Site URL 为最终站点地址，并加入 `https://cai-han.com/todo/reset-password` 等需要的重定向地址。
3. 在南雍待办的 Netlify 站点设置环境变量：`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`NEXT_PUBLIC_BASE_PATH=/todo`。这些变量不要提交到 Git，也不要把 service-role key 填进去。构建命令为 `pnpm exec next build`，使用 Netlify 对 Next.js 的运行时支持，而非静态导出。
4. TODO 站点独立部署成功后，在个人网站 Netlify 配置 `/todo/*` 到 TODO 站点同一路径的 200 代理规则，并把首页卡片指向 `/todo`。代理目标应为你实际的 Netlify TODO 域名，不能使用示例占位符。随后在真实域名下测试注册、验证、登录、创建任务、编辑、标签、删除与重置密码。

该仓库没有运行过数据迁移，也没有连接任何现有 Supabase 项目；现有站点的数据不会因本仓库的代码修改而自动迁入新项目。如果需要保留旧账号/任务，先找到原数据库并导出备份，再决定迁移方式。
