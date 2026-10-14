# CONTEXT.md — Olavarria 3D

> Contexto del producto y guía de trabajo. Leer antes de cambiar la tienda, el panel o la base de datos. No inventar precios, catálogo real, reseñas, zona de entrega ni datos de contacto.

## Producto

- **Marca:** Olavarria 3D
- **Instagram:** [@olavarria3d](https://instagram.com/olavarria3d)
- **Qué es:** tienda online para mostrar productos de impresión 3D y un panel privado para que el dueño mantenga el catálogo.
- **Objetivo:** que las personas exploren las piezas disponibles y consulten por Instagram; el precio se puede mostrar o dejar como “Consultar precio”.
- **Idioma y tono:** español rioplatense, cálido, claro, útil y honesto.
- **Estado:** aplicación preparada; faltan conectar un proyecto Supabase, cargar los datos reales y desplegar en Vercel.

## Tecnología

- Next.js App Router, TypeScript y React.
- Hosting previsto: Vercel.
- Supabase Auth para iniciar sesión del administrador.
- Supabase Postgres para productos con Row Level Security.
- Supabase Storage para imágenes de productos.
- Sin clave `service_role` en el navegador ni en variables `NEXT_PUBLIC_*`.
- No hay registro público de administradores; los usuarios autorizados se incorporan a `public.admin_users` desde Supabase.

## Superficies de la aplicación

- **Tienda cliente (`/`):** catálogo público, filtros por categoría, destacados, imágenes, precio opcional y enlaces de consulta al Instagram real.
- **Ingreso admin (`/admin/login`):** acceso por correo y contraseña de una cuenta autorizada.
- **Panel admin (`/admin`):** listar, buscar, crear, editar, publicar/ocultar y eliminar productos; ordenar; destacar; asignar imágenes JPG/PNG/WebP de hasta 5 MB.
- Los borradores solo son visibles para administradores.
- Los visitantes solo pueden leer productos publicados. Las escrituras se protegen con RLS, no solo con la interfaz.

## Configuración de negocio

Datos confirmados:

- Nombre e Instagram: Olavarria 3D / `@olavarria3d`.
- Contacto web: Instagram.

Pendiente de confirmación:

- Número de WhatsApp.
- Identidad visual oficial, logo y paleta final.
- Productos, categorías, descripciones y fotografías reales.
- Precios, materiales, tiempos, envíos, pagos y política de cambios.
- Link/dominio de producción.

Usar los colores y recursos de la interfaz como propuesta visual, no como brand guide oficial. No mostrar ejemplos de productos como si fueran artículos disponibles.

## Modelo de producto

`public.products` contiene: nombre, descripción, categoría, precio ARS opcional, ruta de imagen opcional, estado publicado/borrador, destacado, orden y timestamps.

`public.admin_users` es una lista de autorización ligada al ID de Supabase Auth. Nunca determinar permisos usando `user_metadata`. La migración y políticas RLS se mantienen en `supabase/migrations/`.

El bucket `product-images` es público para servir las imágenes del catálogo; solo administradores listados pueden subir o borrar objetos. No habilitar carga desde visitantes.

## Reglas de implementación

- Mantener los productos editables desde el panel, sin productos demo ni datos de venta inventados.
- No guardar ni enviar archivos o credenciales fuera de Supabase.
- Revalidar rutas públicas después de editar, publicar u ocultar.
- Los errores de persistencia deben mostrarse claramente y registrarse en servidor; no reemplazarlos por éxitos falsos.
- Mantener compatibilidad con vista móvil, foco visible, inputs accesibles y movimiento reducido.
- Si se cambia la política de acceso, actualizar migración, pruebas RLS y documentación al mismo tiempo.

## Desarrollo y despliegue

Seguir `README.md` para instalación, variables de entorno, aplicación de migraciones, creación manual del administrador y publicación en Vercel.

Comprobaciones esperadas antes de dar un cambio por terminado:

```bash
npm run typecheck
npm run lint
npm run build
npx supabase test db
```

Las pruebas RLS pueden requerir Docker y un stack local de Supabase. La tienda pública muestra un estado informativo si Supabase todavía no fue configurado; el panel no permite administrar sin conexión.
