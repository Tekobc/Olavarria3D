# CONTEXT.md — Olavarria 3D

> Contexto del producto y guía de trabajo. Leer antes de cambiar la tienda, el panel o la base de datos. No inventar precios, catálogo real, reseñas, zona de entrega ni datos de contacto.

## Producto

- **Marca:** Olavarria 3D
- **Instagram:** [@olavarria3d](https://instagram.com/olavarria3d)
- **Qué es:** tienda online para mostrar productos de impresión 3D, recibir pedidos a medida y administrar el catálogo y las consultas.
- **Objetivo:** que las personas exploren las piezas disponibles o envíen una idea con fotos/archivos; el precio se puede mostrar o dejar como “Consultar precio”.
- **Idioma y tono:** español rioplatense, cálido, claro, útil y honesto.
- **Identidad visual:** logo provisto por el usuario y paleta azul/blanco inspirada en el flyer compartido.
- **Estado:** catálogo, acceso admin, pedidos y simulador virtual implementados; faltan aplicar todas las migraciones en Supabase, cargar datos reales y desplegar en Vercel.

## Tecnología

- Next.js App Router, TypeScript y React.
- Three.js r128 para la escena WebGL del simulador; `lucide-react` para iconografía.
- Hosting previsto: Vercel.
- Supabase Auth para iniciar sesión del administrador.
- Supabase Postgres para productos y pedidos con Row Level Security.
- Supabase Storage para imágenes públicas de productos y adjuntos privados de pedidos.
- Sin clave `service_role` en el navegador ni en variables `NEXT_PUBLIC_*`.
- No hay registro público de administradores; los usuarios autorizados se incorporan a `public.admin_users` desde Supabase.

## Superficies de la aplicación

- **Tienda cliente (`/`):** catálogo público con filtros, un carrusel infinito que mezcla aleatoriamente todos los productos publicados, imágenes, precio opcional y enlaces de consulta. Al publicar o agregar productos, la portada se revalida y el carrusel se genera con el catálogo actualizado.
- **Simulador (`/simulador`):** impresora virtual interactiva con cuatro modelos de muestra, velocidad/color configurables, cámara orbital, cuadrícula, audio opcional, progreso, temperaturas y consola G-code. Es una visualización demostrativa, no una cotización ni un control de hardware real.
- **Ingreso admin (`/admin/login`):** acceso por correo y contraseña de una cuenta autorizada.
- **Panel admin (`/admin`):** listar, buscar, crear, editar, publicar/ocultar y eliminar productos; ordenar; destacar; asignar imágenes JPG/PNG/WebP de hasta 5 MB.
- **Pedidos cliente (`/pedidos`):** enviar nombre, contacto, descripción y hasta 5 archivos opcionales (imágenes, PDF o modelos 3D), por selector o arrastrar/soltar, con previsualización principal y miniaturas. Al enviar, se conserva el registro privado en Supabase, se notifica por email con los adjuntos y se ofrece abrir WhatsApp con el mensaje preparado.
- **Bandeja admin (`/admin/pedidos`):** buscar y filtrar pedidos, revisar datos/adjuntos y actualizar su estado.
- Los borradores solo son visibles para administradores.
- Los visitantes solo pueden leer productos publicados. Las escrituras se protegen con RLS, no solo con la interfaz.
- Las personas visitantes pueden crear pedidos, pero no leer ni cambiar pedidos existentes.
- Los adjuntos de pedidos se guardan en el bucket privado `order-attachments`; solo administradores pueden generar enlaces temporales para verlos.

## Configuración de negocio

Datos confirmados:

- Nombre e Instagram: Olavarria 3D / `@olavarria3d`.
- Contacto web: Instagram.
- WhatsApp: `+54 2284 673989`.
- Email para pedidos: `gianfranco1010@gmail.com`.

Pendiente de confirmación:

- Identidad visual oficial, logo y paleta final.
- Productos, categorías, descripciones y fotografías reales.
- Precios, materiales, tiempos, envíos, pagos y política de cambios.
- Link/dominio de producción.

Usar los colores y recursos de la interfaz como propuesta visual, no como brand guide oficial. No mostrar ejemplos de productos como si fueran artículos disponibles.

## Modelo de producto

`public.products` contiene: nombre, descripción, categoría, precio ARS opcional, ruta de imagen opcional, estado publicado/borrador, destacado, orden y timestamps.

`public.admin_users` es una lista de autorización ligada al ID de Supabase Auth. Nunca determinar permisos usando `user_metadata`. La migración y políticas RLS se mantienen en `supabase/migrations/`.

El bucket `product-images` es público para servir las imágenes del catálogo; solo administradores listados pueden subir o borrar objetos. No habilitar carga desde visitantes.

`public.orders` contiene datos de contacto, descripción, adjuntos y estado. El límite de interfaz es de 5 archivos, hasta 10 MB por archivo y 25 MB por envío; Storage limita cada objeto a 10 MB y extensiones a JPG, PNG, WebP, PDF, STL, OBJ, 3MF y STEP.

## Reglas de implementación

- Mantener los productos editables desde el panel, sin productos demo ni datos de venta inventados.
- No guardar ni enviar archivos o credenciales fuera de Supabase.
- Revalidar rutas públicas después de editar, publicar u ocultar.
- Los errores de persistencia deben mostrarse claramente y registrarse en servidor; no reemplazarlos por éxitos falsos.
- Mantener compatibilidad con vista móvil, foco visible, inputs accesibles y movimiento reducido.
- El simulador debe inicializar Three.js solo en cliente y liberar RAF, controles, geometrías, materiales, renderer y audio al desmontarse. No usar scripts CDN ni manipulación directa del DOM para la interfaz.
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
