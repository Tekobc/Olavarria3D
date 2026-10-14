import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("No se pudo verificar la sesión administrativa:", authError.message);
    throw new Error("No se pudo verificar la sesión. Probá recargar la página.");
  }
  if (!user) redirect("/admin/login");

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("No se pudo validar el permiso de administración:", error.message);
    throw new Error("No se pudo validar el acceso al panel.");
  }

  if (!admin) redirect("/admin/login?error=sin-acceso");

  return { supabase, user };
}
