begin;
select plan(4);

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

reset role;
select * from finish();
rollback;
