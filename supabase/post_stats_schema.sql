-- ============================================================
-- Gallery 文章浏览 / 下载统计（多租户 site_id）
-- 在 Supabase Dashboard → SQL Editor 运行（在 gallery_schema 之后）
-- ============================================================

create table if not exists public.post_stats (
  site_id uuid not null,
  post_slug text not null,
  view_count bigint not null default 0 check (view_count >= 0),
  download_count bigint not null default 0 check (download_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (site_id, post_slug)
);

create index if not exists idx_post_stats_site_popularity
  on public.post_stats (site_id, ((view_count + download_count * 3)) desc);

comment on table public.post_stats is 'Gallery 浏览/下载计数（site_id + post_slug）';

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

alter table public.post_stats enable row level security;
