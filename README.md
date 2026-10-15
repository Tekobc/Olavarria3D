# Olavarria 3D

Tienda pública y panel privado de catálogo, preparada para Next.js en Vercel y Supabase Auth, Database y Storage.

## Requisitos

- Node.js 20.9 o superior
- Un proyecto Supabase
- Una cuenta de Vercel para publicar

## Desarrollo local

1. Instalá dependencias:

   ```bash
   npm install
   ```

2. Copiá `.env.example` como `.env.local` y completá la URL del proyecto y su publishable key. Se encuentran en **Supabase → Project Settings → API Keys**. La clave `service_role` también se toma de allí y solo se configura del lado servidor; nunca la agregues al frontend ni a variables `NEXT_PUBLIC_*`.
   Para que el formulario también envíe el correo con adjuntos, configurá en el servidor `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` y `RESEND_FROM_EMAIL`. La dirección remitente debe pertenecer a un dominio verificado en Resend; estas claves nunca llevan el prefijo `NEXT_PUBLIC_`.

3. Para habilitar el correo automático con adjuntos, creá una cuenta en Resend, verificá un dominio propio y creá una API key. Configurá `RESEND_FROM_EMAIL` con una dirección de ese dominio. La app conserva los adjuntos en el bucket privado de Supabase y usa la clave server-only para leerlos al enviar la notificación.

4. Aplicá la migración con Supabase CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push
   ```

5. Iniciá la app:

   ```bash
   npm run dev
   ```

   Tienda: `http://localhost:3000` · Administración: `http://localhost:3000/admin`

## Crear el acceso de administración

El panel no tiene alta pública. Para dar acceso:

1. En **Supabase → Authentication → Users**, invitá o creá el usuario que va a administrar la tienda.
2. En **Authentication → Settings**, desactivá las altas públicas (Allow new users to sign up).
3. En **Supabase → SQL Editor**, agregá su UUID a la lista de administradores:

   ```sql
   insert into public.admin_users (user_id)
   values ('UUID_DEL_USUARIO_DE_AUTH');
   ```

4. Iniciá sesión en `/admin` con ese correo y contraseña.

La autorización se valida en servidor y se refuerza con RLS en Postgres y políticas de Storage. Estar autenticado, por sí solo, no da permisos administrativos.

## Funciones

### Tienda pública

- Catálogo con filtros por categoría.
- Carrusel infinito de productos publicados con orden aleatorio; incorpora los productos al publicarse desde administración.
- Productos destacados, descripción, foto y precio opcional.
- Cuando el precio se deja vacío, la tienda muestra “Consultar precio”.
- CTA de contacto por el canal confirmado: Instagram `@olavarria3d`.
- Simulador interactivo en `/simulador`: vista 3D con modelos de muestra, elección de filamento, velocidad, progreso y consola virtual.

### Administración

- Inicio de sesión por correo y contraseña, sin registro abierto.
- Crear, editar, publicar/ocultar y eliminar productos.
- Borradores invisibles para visitantes.
- Carga de imágenes JPG, PNG o WebP de hasta 5 MB.
- Precio opcional, categoría, orden manual y destacado.
- Búsqueda rápida por nombre o categoría.
- Bandeja privada de pedidos con estados, búsqueda y enlaces temporales a sus archivos.

### Pedidos a medida

- Formulario público en `/pedidos`, disponible desde la navegación y el hero.
- Nombre, un medio de contacto y descripción del proyecto.
- Hasta 5 adjuntos: JPG, PNG, WebP, PDF y modelos STL, OBJ, 3MF o STEP.
- Se pueden seleccionar o arrastrar archivos; máximo 10 MB por archivo y 25 MB por envío. La primera foto se muestra grande y los demás archivos como miniaturas.
- Los adjuntos quedan en un bucket privado. Solo administradores autorizados pueden abrirlos.
- Al enviar, el pedido se guarda en Supabase y se manda por correo a `gianfranco1010@gmail.com` con los adjuntos. También se ofrece abrir WhatsApp `+54 2284 673989` con los datos preparados para que el cliente confirme el envío. WhatsApp no permite que el sitio envíe el mensaje ni adjunte archivos automáticamente.
- Los pedidos se gestionan desde `/admin/pedidos`; sus estados son Nuevo, En revisión, Presupuestado, En producción, Entregado y Cancelado.

La identidad visual usa el logo proporcionado y una paleta de azul, blanco y tonos fríos tomada como referencia del flyer. El precio aparece con mayor jerarquía en cada publicación.

## Datos de producto

La tabla `public.products` mantiene texto, estado de publicación y ruta de imagen. Las fotos se guardan en el bucket `product-images`. El bucket es público solo para mostrar las imágenes ya publicadas; la carga y eliminación de objetos queda restringida a usuarios presentes en `public.admin_users`.

La tabla `public.orders` recibe consultas con RLS: visitantes pueden insertar pedidos, pero no leerlos ni modificarlos. La bandeja y los archivos privados solo están disponibles para usuarios de `public.admin_users`. Se deben aplicar todas las migraciones pendientes para habilitar esta función.

## Vercel

1. Subí este proyecto a un repositorio Git privado o público.
2. Importalo en Vercel como proyecto **Next.js**.
3. Agregá estas variables de entorno para Development, Preview y Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; necesaria para descargar adjuntos privados y enviarlos por correo)
   - `RESEND_API_KEY` (server-only)
   - `RESEND_FROM_EMAIL` (dirección de un dominio verificado en Resend)
4. En Supabase, agregá el dominio de producción de Vercel a **Authentication → URL Configuration → Redirect URLs**. Para desarrollo agregá también `http://localhost:3000/**`.
5. Desplegá. Los previews de Vercel pueden usar el mismo proyecto Supabase o uno separado; para producción conviene separar los datos si se van a probar cambios.

No se necesita `vercel.json` para un proyecto Next.js estándar.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build
npx supabase test db
```

Las pruebas SQL de RLS están en `supabase/tests/catalog_rls.test.sql`. `supabase test db` necesita el stack local de Supabase, habitualmente ejecutado con Docker.

## Decisiones de seguridad

- La clave pública/publishable se usa desde cliente; **nunca** exponer `service_role` ni secret keys.
- `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY` son exclusivamente variables de servidor. La clave de Supabase solo se usa para leer temporalmente los adjuntos privados al crear el correo.
- No hay endpoint ni formulario de registro de administradores.
- `admin_users` es la lista de autorización administrada desde SQL/Supabase Studio.
- RLS protege productos y Storage incluso si alguien intenta acceder fuera de la interfaz.
- El catálogo público devuelve únicamente productos con `is_published = true`.

## Pendiente antes de vender

- Cargar el catálogo real, precios y fotos del emprendimiento.
- Configurar Resend, verificar el dominio remitente y agregar las variables server-only requeridas para activar el email automático.
- Definir zona de entrega, tiempos, métodos de pago y política de cambios.
