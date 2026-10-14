import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { requireAdmin } from "@/lib/admin";
import { AdminProducts } from "@/app/components/AdminProducts";
import type { Product } from "@/lib/types";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!getSupabaseConfig()) redirect("/admin/login");

  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("No se pudieron cargar los productos del panel:", error.message);
    throw new Error("No se pudo cargar la lista de productos. Revisá la conexión con Supabase.");
  }

  const products: Product[] = data;
  const imageUrls = Object.fromEntries(
    products
      .filter((product): product is Product & { image_path: string } => product.image_path !== null)
      .map((product) => [
        product.id,
        supabase.storage.from("product-images").getPublicUrl(product.image_path).data.publicUrl,
      ]),
  );

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-brand" href="/">
          <span className="admin-brand-mark" aria-hidden="true">O3</span>
          <span>OLAVARRIA 3D <span className="muted">/ ADMIN</span></span>
        </a>
        <div className="admin-top-actions">
          <span>{user.email}</span>
          <a className="admin-link" href="/" target="_blank" rel="noreferrer">Ver tienda ↗</a>
          <form action={signOutAction}><button className="admin-button-secondary" type="submit">Cerrar sesión</button></form>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="admin-eyebrow">CATÁLOGO / GESTIÓN</p>
            <h1>Productos</h1>
            <p className="admin-subtitle">Cargá una pieza una vez y decidí cuándo aparece en la tienda.</p>
          </div>
          <span className="admin-product-count">{products.length} {products.length === 1 ? "producto" : "productos"}</span>
        </div>
        <AdminProducts products={products} imageUrls={imageUrls} />
      </main>
    </div>
  );
}
