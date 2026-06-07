-- ============================================================
-- PRO BLOG 商用图库模块 · Supabase 一键建表（多租户 site_id）
-- 在 Supabase Dashboard → SQL Editor → New query → 粘贴运行
-- ============================================================

create extension if not exists "pgcrypto";

-- 一套图库 = 一篇作品（site_id + post_slug 租户内唯一）
create table if not exists public.galleries (
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

create index if not exists idx_galleries_site_id on public.galleries (site_id);

create table if not exists public.gallery_images (
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

create index if not exists idx_gallery_images_gallery_sort
  on public.gallery_images (gallery_id, sort_order);
create index if not exists idx_gallery_images_site_id
  on public.gallery_images (site_id);

create or replace function public.set_galleries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_galleries_updated_at on public.galleries;
create trigger trg_galleries_updated_at
  before update on public.galleries
  for each row
  execute function public.set_galleries_updated_at();

create or replace function public.sync_gallery_image_count()
returns trigger
language plpgsql
as $$
declare
  gid uuid;
begin
  if tg_op = 'DELETE' then
    gid := old.gallery_id;
  else
    gid := new.gallery_id;
  end if;
  update public.galleries g
  set image_count = (
    select count(*)::integer from public.gallery_images i where i.gallery_id = gid
  )
  where g.id = gid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_gallery_image_count_ins on public.gallery_images;
create trigger trg_sync_gallery_image_count_ins
  after insert on public.gallery_images
  for each row
  execute function public.sync_gallery_image_count();

drop trigger if exists trg_sync_gallery_image_count_del on public.gallery_images;
create trigger trg_sync_gallery_image_count_del
  after delete on public.gallery_images
  for each row
  execute function public.sync_gallery_image_count();

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

alter table public.galleries enable row level security;
alter table public.gallery_images enable row level security;

comment on table public.galleries is 'Gallery 图库元数据（site_id + post_slug 多租户）';
comment on table public.gallery_images is '图库图片 URL（兰空）；file_size 用于租户容量统计';
