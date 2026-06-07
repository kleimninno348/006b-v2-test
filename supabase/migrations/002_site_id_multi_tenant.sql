-- ============================================================
-- 多租户：共用 Supabase + site_id（merchant_services.id）
-- 在已有 gallery / post_stats 表的环境执行一次
-- 执行前请将下方 DEFAULT_SITE_ID 换成实际商户 UUID，或先 backfill 再设 NOT NULL
-- ============================================================

-- 1) 新增列
alter table public.galleries add column if not exists site_id uuid;
alter table public.gallery_images add column if not exists site_id uuid;
alter table public.post_stats add column if not exists site_id uuid;

-- 2) 旧数据回填（单租户迁移时把 NULL 填成该站 UUID；多租户请按业务分批 UPDATE）
-- update public.galleries set site_id = '00000000-0000-0000-0000-000000000000'::uuid where site_id is null;
-- update public.post_stats set site_id = '00000000-0000-0000-0000-000000000000'::uuid where site_id is null;

-- 3) gallery_images.site_id 从 galleries 同步
update public.gallery_images gi
set site_id = g.site_id
from public.galleries g
where gi.gallery_id = g.id
  and gi.site_id is null
  and g.site_id is not null;

-- 4) 唯一约束：post_slug 全局唯一 → (site_id, post_slug)
alter table public.galleries drop constraint if exists galleries_post_slug_unique;
drop index if exists idx_galleries_post_slug;

create unique index if not exists galleries_site_id_post_slug_key
  on public.galleries (site_id, post_slug);

create index if not exists idx_galleries_site_id on public.galleries (site_id);
create index if not exists idx_gallery_images_site_id on public.gallery_images (site_id);

-- 5) post_stats 主键改为 (site_id, post_slug)
alter table public.post_stats drop constraint if exists post_stats_pkey;

create unique index if not exists post_stats_site_id_post_slug_key
  on public.post_stats (site_id, post_slug);

-- 回填并设 NOT NULL 后取消注释：
-- alter table public.galleries alter column site_id set not null;
-- alter table public.gallery_images alter column site_id set not null;
-- alter table public.post_stats alter column site_id set not null;
-- alter table public.post_stats add primary key (site_id, post_slug);

-- 6) 写入 gallery_images 时自动带上 site_id
create or replace function public.sync_gallery_image_site_id()
returns trigger
language plpgsql
as $$
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
  for each row
  execute function public.sync_gallery_image_site_id();

-- 7) 按 site_id 递增统计
drop function if exists public.increment_post_stat(text, text);

create or replace function public.increment_post_stat(
  p_site_id uuid,
  p_slug text,
  p_field text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_site_id is null or p_slug is null or length(trim(p_slug)) = 0 then
    return;
  end if;
  if p_field not in ('view', 'download') then
    return;
  end if;

  insert into public.post_stats (site_id, post_slug, view_count, download_count)
  values (
    p_site_id,
    trim(p_slug),
    case when p_field = 'view' then 1 else 0 end,
    case when p_field = 'download' then 1 else 0 end
  )
  on conflict (site_id, post_slug) do update
  set
    view_count = post_stats.view_count + case when p_field = 'view' then 1 else 0 end,
    download_count = post_stats.download_count + case when p_field = 'download' then 1 else 0 end,
    updated_at = now();
end;
$$;

-- 需先执行：确保 post_stats 有 (site_id, post_slug) 唯一索引且 site_id 已 NOT NULL
-- 若 on conflict 报错，请先完成 backfill + NOT NULL + primary key 步骤

comment on column public.galleries.site_id is 'merchant_services.id，多租户隔离';
comment on column public.gallery_images.site_id is '冗余 site_id，便于按租户统计容量';
comment on column public.post_stats.site_id is 'merchant_services.id';
