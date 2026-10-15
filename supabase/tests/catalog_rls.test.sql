begin;
select plan(10);

insert into public.products (
  id, name, description, category, is_published
) values
  (
    'f42ed1d0-6c3a-4e90-a94b-ef01848fe7da',
    'Producto publicado de prueba',
    'Fixture temporal para probar las políticas públicas.',
    'Pruebas',
    true
  ),
  (
    'd436c963-461a-4b33-91b9-781df141845e',
    'Borrador de prueba',
    'Fixture temporal para validar que los borradores no sean públicos.',
    'Pruebas',
    false
  );

set local role anon;

select is(
  (select count(*) from public.products where id = 'f42ed1d0-6c3a-4e90-a94b-ef01848fe7da'),
  1::bigint,
  'La persona visitante puede ver un producto publicado'
);

select is(
  (select count(*) from public.products where id = 'd436c963-461a-4b33-91b9-781df141845e'),
  0::bigint,
  'La persona visitante no puede ver un borrador'
);

select ok(
  not has_table_privilege('anon', 'public.products', 'INSERT'),
  'La persona visitante no tiene permiso SQL para insertar productos'
);

select ok(
  not has_table_privilege('anon', 'public.products', 'DELETE'),
  'La persona visitante no tiene permiso SQL para eliminar productos'
);

select ok(
  has_table_privilege('anon', 'public.orders', 'INSERT'),
  'La persona visitante puede enviar pedidos'
);

select ok(
  not has_table_privilege('anon', 'public.orders', 'SELECT'),
  'La persona visitante no puede leer pedidos recibidos'
);

select ok(
  not has_table_privilege('anon', 'public.orders', 'UPDATE'),
  'La persona visitante no puede modificar pedidos'
);

select ok(
  not has_table_privilege('anon', 'public.orders', 'DELETE'),
  'La persona visitante no puede eliminar pedidos'
);

select lives_ok(
  $$
    insert into public.orders (customer_name, contact, details)
    values ('Cliente de prueba', 'cliente@example.com', 'Pedido de prueba para revisar RLS.')
  $$,
  'La persona visitante puede crear un pedido'
);

reset role;
set local role authenticated;

select is(
  (select count(*) from public.orders),
  0::bigint,
  'Una cuenta autenticada que no es administradora no puede leer pedidos'
);

reset role;
select * from finish();
rollback;
