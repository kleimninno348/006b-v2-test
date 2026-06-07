-- 博客主题即时读源（避免 Notion DB filter 索引延迟导致 ISR 仍读到旧主题）
create table if not exists public.blog_site_settings (
  site_id uuid primary key,
  theme_code text not null default 'v1',
  theme_config_page_id text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_site_settings_updated_at
  on public.blog_site_settings (updated_at desc);

comment on table public.blog_site_settings is
  '每商户博客运行时主题（theme_code: v1/v2/gallery）；后台切换时与 Notion theme-config 双写';
