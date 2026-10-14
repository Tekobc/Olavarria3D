import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { loginAction } from "./actions";

const loginErrors: Record<string, string> = {
  campos: "Ingresá tu correo y contraseña.",
  credenciales: "No pudimos iniciar sesión con esos datos.",
  "sin-acceso": "No pudimos iniciar sesión con esos datos.",
  validacion: "No pudimos validar los permisos. Probá de nuevo.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = Boolean(getSupabaseConfig());
  const params = await searchParams;
  const errorMessage = params.error ? loginErrors[params.error] : null;

  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: admin } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (admin) redirect("/admin");
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Link className="admin-brand" href="/">
          <span className="admin-brand-mark" aria-hidden="true">O3</span>
          <span>OLAVARRIA 3D</span>
        </Link>
        <p className="admin-eyebrow">ÁREA PRIVADA</p>
        <h1 id="login-title">Administración</h1>
        <p>Ingresá para gestionar productos, imágenes y publicaciones del catálogo.</p>
        {!configured ? (
          <div className="form-message info" role="status">
            Falta configurar Supabase. Completá las variables de entorno indicadas en el README para habilitar el acceso.
          </div>
        ) : (
          <form action={loginAction} className="login-form">
            <label className="admin-field">
              Correo electrónico
              <input autoComplete="username" name="email" required type="email" />
            </label>
            <label className="admin-field">
              Contraseña
              <input autoComplete="current-password" name="password" required type="password" />
            </label>
            {errorMessage && <div className="form-message" role="alert">{errorMessage}</div>}
            <button className="admin-button" type="submit">Entrar al panel <span aria-hidden="true">→</span></button>
          </form>
        )}
        <p className="login-footnote">Acceso solo para cuentas autorizadas. El registro público está deshabilitado.</p>
      </section>
    </main>
  );
}
