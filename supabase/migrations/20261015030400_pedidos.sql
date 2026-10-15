create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 100),
  contact text not null check (char_length(trim(contact)) between 5 and 160),
  details text not null check (char_length(trim(details)) between 10 and 3000),
  attachments jsonb not null default '[]'::jsonb check (
    jsonb_typeof(attachments) = 'array'
    and jsonb_array_length(attachments) <= 5
  ),
  status text not null default 'received' check (
    status in ('received', 'reviewing', 'quoted', 'in_progress', 'completed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_products_updated_at();

alter table public.orders enable row level security;
revoke all on table public.orders from anon, authenticated;
grant insert on table public.orders to anon, authenticated;
grant select, update on table public.orders to authenticated;

drop policy if exists "Anyone can submit orders" on public.orders;
create policy "Anyone can submit orders"
on public.orders
for insert
to anon, authenticated
with check (status = 'received');

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-attachments',
  'order-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/sla',
    'model/stl',
    'model/obj',
    'model/3mf',
    'model/step',
    'application/step'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant insert on table storage.objects to anon, authenticated;
grant select, delete on table storage.objects to authenticated;

drop policy if exists "Visitors can upload order attachments" on storage.objects;
create policy "Visitors can upload order attachments"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'order-attachments'
  and name ~ '^orders/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp|pdf|stl|obj|3mf|step|stp)$'
);

drop policy if exists "Admins can read order attachments" on storage.objects;
create policy "Admins can read order attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'order-attachments'
  and exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can delete order attachments" on storage.objects;
create policy "Admins can delete order attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'order-attachments'
  and exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  )
);