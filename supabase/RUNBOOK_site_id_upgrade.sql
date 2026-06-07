-- ============================================================
-- 共用 Supabase Project · site_id 多租户升级跑本
-- 位置：Supabase Dashboard → SQL Editor → New query → 整段粘贴 Run
--
-- 使用前请先确认属于哪一种：
--   A) 从未建过 galleries 表 → 不要跑本文件，改跑：
--      1) gallery_schema.sql
--      2) post_stats_schema.sql
--   B) 已有旧版 galleries（只有 post_slug 唯一、无 site_id）→ 跑下面「B 路径」
-- ============================================================


-- ============================================================
-- B 路径 · 第 0 步（可选）：若只是测试数据、可全部清空
-- 不需要清空就跳过本段，改跑第 1 步后用第 2 步 backfill
-- ============================================================
-- truncate table public.gallery_images cascade;
-- truncate table public.post_stats;
-- truncate table public.galleries cascade;


-- ============================================================
-- B 路径 · 第 1 步：加列、改约束、改函数（与 002_site_id_multi_tenant.sql 相同）
-- 可直接 Run，与是否清空无关
-- ============================================================
alter table public.galleries add column if not exists site_id uuid;
alter table public.gallery_images add column if not exists site_id uuid;
alter table public.post_stats add column if not exists site_id uuid;

update public.gallery_images gi
set site_id = g.site_id
from public.galleries g
where gi.gallery_id = g.id
  and gi.site_id is null
  and g.site_id is not null;

alter table public.galleries drop constraint if exists galleries_post_slug_unique;
drop index if exists idx_galleries_post_slug;

create unique index if not exists galleries_site_id_post_slug_key
  on public.galleries (site_id, post_slug);
create index if not exists idx_galleries_site_id on public.galleries (site_id);
create index if not exists idx_gallery_images_site_id on public.gallery_images (site_id);

alter table public.post_stats drop constraint if exists post_stats_pkey;
drop index if exists post_stats_site_id_post_slug_key;
create unique index if not exists post_stats_site_id_post_slug_key
  on public.post_stats (site_id, post_slug);

create or replace function public.sync_gallery_image_site_id()
returns trigger language plpgsql as $$
begin
  if new.site_id is null then
    select g.site_id into new.site_id from public.galleries g where g.id = new.gallery_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_gallery_image_site_id on public.gallery_images;
create trigger trg_sync_gallery_image_site_id
  before insert or update on public.gallery_images
  for each row execute function public.sync_gallery_image_site_id();

drop function if exists public.increment_post_stat(text, text);

create or replace function public.increment_post_stat(
  p_site_id uuid,
  p_slug text,
  p_field text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_site_id is null or p_slug is null or length(trim(p_slug)) = 0 then return;
  end if;
  if p_field not in ('view', 'download') then return;
  end if;
  insert into public.post_stats (site_id, post_slug, view_count, download_count)
  values (
    p_site_id, trim(p_slug),
    case when p_field = 'view' then 1 else 0 end,
    case when p_field = 'download' then 1 else 0 end
  )
  on conflict (site_id, post_slug) do update set
    view_count = post_stats.view_count + case when p_field = 'view' then 1 else 0 end,
    download_count = post_stats.download_count + case when p_field = 'download' then 1 else 0 end,
    updated_at = now();
end;
$$;


-- ============================================================
-- B 路径 · 第 2 步：回填 site_id（必做，否则新 Blog 读不到旧数据）
-- ⚠️ 把下面 UUID 换成 SRV-Z4SOBC 的 merchant_services.id
--    （商户系统 sync-blog-site-env 写入的 BLOG_SITE_ID 必须与此相同）
-- ============================================================
-- update public.galleries set site_id = '在此粘贴-SRV-Z4SOBC的-merchant_services.id'::uuid where site_id is null;
-- update public.gallery_images gi set site_id = g.site_id from public.galleries g where gi.gallery_id = g.id and gi.site_id is null;
-- update public.post_stats set site_id = '在此粘贴-同上-UUID'::uuid where site_id is null;


-- ============================================================
-- B 路径 · 第 3 步：设 NOT NULL + post_stats 主键（第 2 步 backfill 后再 Run）
-- ============================================================
-- alter table public.galleries alter column site_id set not null;
-- alter table public.gallery_images alter column site_id set not null;
-- alter table public.post_stats alter column site_id set not null;
-- alter table public.post_stats add primary key (site_id, post_slug);


-- ============================================================
-- 验证（可选）
-- ============================================================
-- select site_id, count(*) from public.galleries group by site_id;
-- select proname from pg_proc where proname = 'increment_post_stat';
