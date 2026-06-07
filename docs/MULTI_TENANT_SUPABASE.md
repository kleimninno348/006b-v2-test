# 共用 Supabase + site_id 多租户

## 模型

- **1 个 Supabase Project** 服务所有商户 Blog（节省每 Project ~$10/月 compute）
- 图床文件在兰空；Supabase 仅存图库元数据、`file_size`、浏览统计
- 租户隔离键：`site_id` = `merchant_services.id`（UUID）
- 每站容量：`GALLERY_QUOTA_GB`（默认 50），按 `site_id` 汇总 `gallery_images.file_size`

## 商户系统写入每个 Blog Vercel env

| 变量 | 说明 |
|------|------|
| `BLOG_SITE_ID` | `merchant_services.id` |
| `GALLERY_QUOTA_GB` | 默认 `50` |
| `NEXT_PUBLIC_SUPABASE_URL` | 全局共用 |
| `SUPABASE_SERVICE_ROLE_KEY` | 全局共用 |
| `BLOG_LOGIN_JWT_SECRET` | Phase A 已有；JWT `site_id` 须与 `BLOG_SITE_ID` 一致 |

## 数据库

**新环境**：依次执行

1. `supabase/gallery_schema.sql`
2. `supabase/post_stats_schema.sql`

**已有环境升级**：`supabase/migrations/002_site_id_multi_tenant.sql`

- 为 `galleries` / `gallery_images` / `post_stats` 增加 `site_id`
- 唯一约束：`UNIQUE(site_id, post_slug)`
- `increment_post_stat(p_site_id, p_slug, p_field)` 替换旧版单参数函数

升级后须 **backfill** 旧行 `site_id`，再设 `NOT NULL`（见 migration 内注释）。

## Blog 代码

- 读写均带 `.eq('site_id', getBlogSiteId())`
- `isGalleryTenantConfigured()` = Supabase env + `BLOG_SITE_ID`
- JWT 登录：若配置了 `BLOG_SITE_ID`，token 中 `site_id` 必须一致

## 不做

- 每租户独立 Supabase Project（原 Phase B）
- Supabase Management API 开户
