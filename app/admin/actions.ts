"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(100),
  description: z.string().trim().max(2000, "La descripción es demasiado larga."),
  category: z.string().trim().min(1, "Ingresá una categoría.").max(60),
  price: z.preprocess(
    (value) => value === "" || value === null ? null : Number(value),
    z.number().finite().nonnegative().nullable(),
  ),
  image_path: z.preprocess(
    (value) => value === "" || value === null ? null : value,
    z.string().regex(/^products\/[0-9a-f-]+\.(jpg|png|webp)$/i, "La imagen no tiene una ruta válida.").nullable(),
  ),
  featured: z.boolean(),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0).max(100000),
});

function readCheckbox(value: FormDataEntryValue | null) {
  return value === "on";
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function saveProductAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = productSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    price: String(formData.get("price") ?? ""),
    image_path: String(formData.get("image_path") ?? ""),
    featured: readCheckbox(formData.get("featured")),
    is_published: readCheckbox(formData.get("is_published")),
    sort_order: Number(formData.get("sort_order") || 0),
  });

  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Revisá los datos del producto." };
  }

  const { id, ...product } = parsed.data;
  const response = id
    ? await supabase.from("products").update(product).eq("id", id).select("id").maybeSingle()
    : await supabase.from("products").insert(product);

  if (response.error || (id && !response.data)) {
    if (response.error) console.error("No se pudo guardar el producto:", response.error.message);
    return { ok: false as const, message: "No se pudo guardar el producto. Revisá los datos e intentá de nuevo." };
  }

  revalidateCatalog();
  return { ok: true as const, message: "Producto guardado." };
}

export async function setProductVisibilityAction(id: string, isPublished: boolean) {
  const { supabase } = await requireAdmin();
  const validId = z.string().uuid().safeParse(id);
  if (!validId.success) return { ok: false as const, message: "El producto no es válido." };

  const { data, error } = await supabase
    .from("products")
    .update({ is_published: isPublished })
    .eq("id", validId.data)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("No se pudo cambiar la publicación:", error.message);
    return { ok: false as const, message: "No se pudo actualizar la publicación." };
  }

  revalidateCatalog();
  return { ok: true as const, message: isPublished ? "Producto publicado." : "Producto pasado a borrador." };
}

export async function deleteProductAction(id: string) {
  const { supabase } = await requireAdmin();
  const validId = z.string().uuid().safeParse(id);
  if (!validId.success) return { ok: false as const, message: "El producto no es válido." };

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", validId.data)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("No se pudo eliminar el producto:", error.message);
    return { ok: false as const, message: "No se pudo eliminar el producto." };
  }
  if (!data) return { ok: false as const, message: "El producto ya no existe o no está disponible." };

  revalidateCatalog();
  return { ok: true as const, message: "Producto eliminado." };
}

export async function signOutAction() {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("No se pudo cerrar la sesión:", error.message);
    throw new Error("No se pudo cerrar la sesión. Probá nuevamente.");
  }
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
