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

2. Copiá `.env.example` como `.env.local` y completá la URL del proyecto y su publishable key. Se encuentran en **Supabase → Project Settings → API Keys**. No agregues una secret/service-role key al frontend ni a variables `NEXT_PUBLIC_*`.

3. Aplicá la migración con Supabase CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push
   ```

4. Iniciá la app:

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
- Productos destacados, descripción, foto y precio opcional.
- Cuando el precio se deja vacío, la tienda muestra “Consultar precio”.
- CTA de contacto por el canal confirmado: Instagram `@olavarria3d`.

### Administración

- Inicio de sesión por correo y contraseña, sin registro abierto.
- Crear, editar, publicar/ocultar y eliminar productos.
- Borradores invisibles para visitantes.
- Carga de imágenes JPG, PNG o WebP de hasta 5 MB.
- Precio opcional, categoría, orden manual y destacado.
- Búsqueda rápida por nombre o categoría.

## Datos de producto

La tabla `public.products` mantiene texto, estado de publicación y ruta de imagen. Las fotos se guardan en el bucket `product-images`. El bucket es público solo para mostrar las imágenes ya publicadas; la carga y eliminación de objetos queda restringida a usuarios presentes en `public.admin_users`.

## Vercel

1. Subí este proyecto a un repositorio Git privado o público.
2. Importalo en Vercel como proyecto **Next.js**.
3. Agregá estas variables de entorno para Development, Preview y Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
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

La prueba SQL de RLS está en `supabase/tests/catalog_rls.test.sql`. `supabase test db` necesita el stack local de Supabase, habitualmente ejecutado con Docker.

## Decisiones de seguridad

- La clave pública/publishable se usa desde cliente; **nunca** exponer `service_role` ni secret keys.
- No hay endpoint ni formulario de registro de administradores.
- `admin_users` es la lista de autorización administrada desde SQL/Supabase Studio.
- RLS protege productos y Storage incluso si alguien intenta acceder fuera de la interfaz.
- El catálogo público devuelve únicamente productos con `is_published = true`.

## Pendiente antes de vender

- Cargar el catálogo real, precios y fotos del emprendimiento.
- Confirmar si el negocio quiere recibir consultas también por WhatsApp y sumar el número real.
- Definir zona de entrega, tiempos, métodos de pago y política de cambios.
