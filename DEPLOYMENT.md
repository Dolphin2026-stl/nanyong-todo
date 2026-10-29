# 南雍待办部署准备

当前版本的账号与任务由 **Supabase Auth + PostgreSQL** 维护。没有 Supabase 项目时，页面可以构建，但注册、登录和任务保存不能工作。请勿使用 service-role 密钥作为公开网站的环境变量。

1. Supabase 项目 `Nanyong Todo`（`axwaaxojosmujcdkcrhc`）已建立，并已应用 [`supabase/schema.sql`](supabase/schema.sql)；**不要再手动运行这份初始化脚本**。四张业务表已创建并启用 RLS。若将来改用其他新项目，才需在其 SQL Editor 中运行脚本；已有数据的项目应先备份并核对表结构。
2. 在 Authentication → Providers 开启 Email。建议开启邮箱验证；在 URL Configuration 设置 Site URL 为最终站点地址，并加入 `https://cai-han.com/todo/reset-password` 等需要的重定向地址。
3. 在 Netlify 从本 GitHub 仓库新建独立站点。仓库中的 `netlify.toml` 已设好构建命令、Supabase URL 和 `/todo` 路径；你只需在站点的 Environment variables 添加 `SUPABASE_ANON_KEY`，值为 Supabase 的 publishable key。不要填 service-role key。Netlify 应使用 Next.js 运行时支持，而非静态导出。
4. TODO 站点独立部署成功后，在个人网站 Netlify 配置 `/todo/*` 到 TODO 站点同一路径的 200 代理规则，并把首页卡片指向 `/todo`。代理目标应为你实际的 Netlify TODO 域名，不能使用示例占位符。随后在真实域名下测试注册、验证、登录、创建任务、编辑、标签、删除与重置密码。

新的 Supabase 项目目前没有账号和任务。旧扣子站点的数据不会因建表或代码修改自动迁入；如果需要保留旧账号/任务，先找到原数据库并导出备份，再决定迁移方式。
