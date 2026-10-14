"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/admin/login?error=campos");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/admin/login?error=credenciales");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError) {
    console.error("No se pudo comprobar el permiso de administración:", adminError.message);
    await supabase.auth.signOut();
    redirect("/admin/login?error=validacion");
  }

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=sin-acceso");
  }

  redirect("/admin");
}
