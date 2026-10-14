create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (char_length(trim(category)) between 1 and 60),
  price numeric(12, 2) check (price is null or price >= 0),
  image_path text check (
    image_path is null
    or image_path ~ '^products/[0-9a-fA-F-]+\.(jpg|png|webp)$'
  ),
  featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_public_catalog_order_idx
  on public.products (is_published, featured desc, sort_order, created_at desc);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_products_updated_at();

alter table public.admin_users enable row level security;
alter table public.products enable row level security;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;
revoke all on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

drop policy if exists "Admins can see their own admin record" on public.admin_users;
create policy "Admins can see their own admin record"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Anyone can read published products" on public.products;
create policy "Anyone can read published products"
on public.products
for select
to anon, authenticated
using (is_published);

drop policy if exists "Admins can read all products" on public.products;
create policy "Admins can read all products"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant insert, delete on table storage.objects to authenticated;

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);