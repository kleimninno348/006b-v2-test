-- ============================================================
-- 路径 A · 清空测试数据后全新建表（多租户 site_id）
--
-- 在哪执行：共用的那一个图库 Supabase Project
--   Dashboard → SQL Editor → New query → 整段粘贴 → Run 一次
--
-- 会删除：galleries / gallery_images / post_stats 及全部测试数据
-- 然后按最新 schema 重建（含 site_id、按租户 50GB 逻辑所需结构）
-- ============================================================

-- 1) 删掉旧表（测试数据一并清空）
drop trigger if exists trg_sync_gallery_image_site_id on public.gallery_images;
drop trigger if exists trg_sync_gallery_image_count_ins on public.gallery_images;
drop trigger if exists trg_sync_gallery_image_count_del on public.gallery_images;
drop trigger if exists trg_galleries_updated_at on public.galleries;

drop table if exists public.gallery_images cascade;
drop table if exists public.post_stats cascade;
drop table if exists public.galleries cascade;

drop function if exists public.sync_gallery_image_site_id();
drop function if exists public.sync_gallery_image_count();
drop function if exists public.set_galleries_updated_at();
drop function if exists public.increment_post_stat(uuid, text, text);
drop function if exists public.increment_post_stat(text, text);

-- 2) 全新建表（= gallery_schema.sql + post_stats_schema.sql）
create extension if not exists "pgcrypto";

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  post_slug text not null,
  post_notion_id text,
  title text,
  image_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint galleries_site_id_post_slug_key unique (site_id, post_slug)
);

create index idx_galleries_site_id on public.galleries (site_id);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  site_id uuid not null,
  url text not null,
  thumb_url text,
  sort_order integer not null default 0,
  width integer,
  height integer,
  file_size integer,
  created_at timestamptz not null default now()
);

create index idx_gallery_images_gallery_sort
  on public.gallery_images (gallery_id, sort_order);
create index idx_gallery_images_site_id
  on public.gallery_images (site_id);

create or replace function public.set_galleries_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_galleries_updated_at
  before update on public.galleries
  for each row execute function public.set_galleries_updated_at();

create or replace function public.sync_gallery_image_count()
returns trigger language plpgsql as $$
declare
  gid uuid;
begin
  if tg_op = 'DELETE' then gid := old.gallery_id;
  else gid := new.gallery_id;
  end if;
  update public.galleries g
  set image_count = (
    select count(*)::integer from public.gallery_images i where i.gallery_id = gid
  )
  where g.id = gid;
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_gallery_image_count_ins
  after insert on public.gallery_images
  for each row execute function public.sync_gallery_image_count();

create trigger trg_sync_gallery_image_count_del
  after delete on public.gallery_images
  for each row execute function public.sync_gallery_image_count();

create or replace function public.sync_gallery_image_site_id()
returns trigger language plpgsql as $$
begin
  if new.site_id is null then
    select g.site_id into new.site_id from public.galleries g where g.id = new.gallery_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_gallery_image_site_id
  before insert or update on public.gallery_images
  for each row execute function public.sync_gallery_image_site_id();

alter table public.galleries enable row level security;
alter table public.gallery_images enable row level security;

create table public.post_stats (
  site_id uuid not null,
  post_slug text not null,
  view_count bigint not null default 0 check (view_count >= 0),
  download_count bigint not null default 0 check (download_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (site_id, post_slug)
);

create index idx_post_stats_site_popularity
  on public.post_stats (site_id, ((view_count + download_count * 3)) desc);

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

alter table public.post_stats enable row level security;

-- 博客主题即时读源（ISR 用，避免 Notion filter 索引延迟）
create table if not exists public.blog_site_settings (
  site_id uuid primary key,
  theme_code text not null default 'v1',
  theme_config_page_id text,
  updated_at timestamptz not null default now()
);

-- 3) 验证（结果应为 galleries / gallery_images / post_stats / blog_site_settings）
-- select table_name from information_schema.tables
--   where table_schema = 'public' and table_name in ('galleries','gallery_images','post_stats');
