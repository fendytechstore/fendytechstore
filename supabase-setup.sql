-- FENDY FREELANCE STORE PRO - jalankan di Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()); $$;

create table if not exists public.categories (
  id text primary key, name text not null, description text default '',
  image_url text default '', sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.brands (
  id text primary key, name text not null,
  category_id text references public.categories(id) on update cascade on delete set null,
  image_url text default '', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.products (
  id text primary key, slug text unique not null, name text not null,
  price numeric(14,2) not null default 0 check(price >= 0),
  promo_price numeric(14,2) check(promo_price is null or promo_price >= 0),
  brand_id text references public.brands(id) on update cascade on delete set null,
  category_id text references public.categories(id) on update cascade on delete set null,
  image_url text default '', specs text default '', status text not null default 'dijual',
  bonus text default '', stock integer, is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_brand_idx on public.products(brand_id);
create index if not exists products_active_idx on public.products(is_active,status);
create index if not exists products_slug_idx on public.products(slug);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), order_code text unique not null,
  customer_name text not null, customer_phone text not null,
  customer_address text default '', customer_note text default '',
  checkout_method text not null check(checkout_method in ('website','whatsapp')),
  items jsonb not null default '[]'::jsonb, subtotal numeric(14,2) not null default 0,
  status text not null default 'baru',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "admin read self" on public.admin_users;
create policy "admin read self" on public.admin_users for select to authenticated using(user_id=auth.uid());

drop policy if exists "public categories read" on public.categories;
create policy "public categories read" on public.categories for select to anon,authenticated using(is_active or public.is_store_admin());
drop policy if exists "admin categories all" on public.categories;
create policy "admin categories all" on public.categories for all to authenticated using(public.is_store_admin()) with check(public.is_store_admin());

drop policy if exists "public brands read" on public.brands;
create policy "public brands read" on public.brands for select to anon,authenticated using(is_active or public.is_store_admin());
drop policy if exists "admin brands all" on public.brands;
create policy "admin brands all" on public.brands for all to authenticated using(public.is_store_admin()) with check(public.is_store_admin());

drop policy if exists "public products read" on public.products;
create policy "public products read" on public.products for select to anon,authenticated
using((is_active and lower(status) <> 'tidak dijual') or public.is_store_admin());
drop policy if exists "admin products all" on public.products;
create policy "admin products all" on public.products for all to authenticated using(public.is_store_admin()) with check(public.is_store_admin());

-- Pengunjung hanya boleh membuat pesanan. Data pesanan tidak bisa dibaca publik.
drop policy if exists "public order insert" on public.orders;
create policy "public order insert" on public.orders for insert to anon,authenticated with check(true);
drop policy if exists "admin orders read" on public.orders;
create policy "admin orders read" on public.orders for select to authenticated using(public.is_store_admin());
drop policy if exists "admin orders update" on public.orders;
create policy "admin orders update" on public.orders for update to authenticated using(public.is_store_admin()) with check(public.is_store_admin());
drop policy if exists "admin orders delete" on public.orders;
create policy "admin orders delete" on public.orders for delete to authenticated using(public.is_store_admin());

-- Bucket foto katalog publik (maksimum 5 MB per file).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('store-images','store-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true,file_size_limit=5242880;

drop policy if exists "public view store images" on storage.objects;
create policy "public view store images" on storage.objects for select to anon,authenticated using(bucket_id='store-images');
drop policy if exists "admin upload store images" on storage.objects;
create policy "admin upload store images" on storage.objects for insert to authenticated
with check(bucket_id='store-images' and public.is_store_admin());
drop policy if exists "admin update store images" on storage.objects;
create policy "admin update store images" on storage.objects for update to authenticated
using(bucket_id='store-images' and public.is_store_admin()) with check(bucket_id='store-images' and public.is_store_admin());
drop policy if exists "admin delete store images" on storage.objects;
create policy "admin delete store images" on storage.objects for delete to authenticated
using(bucket_id='store-images' and public.is_store_admin());

-- Setelah membuat akun admin di Authentication > Users, ambil UUID-nya lalu jalankan:
-- insert into public.admin_users(user_id) values ('UUID-AKUN-ADMIN');
