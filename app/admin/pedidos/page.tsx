import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/app/components/BrandMark";
import { AdminOrders } from "@/app/components/AdminOrders";
import { requireAdmin } from "@/lib/admin";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Order, OrderAttachment, OrderStatus } from "@/lib/types";
import { signOutAction } from "../actions";

export const dynamic = "force-dynamic";

const statuses: OrderStatus[] = ["received", "reviewing", "quoted", "in_progress", "completed", "cancelled"];

function parseAttachments(value: unknown): OrderAttachment[] {
  if (!Array.isArray(value) || value.length > 5) throw new Error("El pedido tiene una lista de adjuntos inválida.");
  return value.map((item) => {
    if (
      typeof item !== "object" || item === null
      || typeof item.path !== "string" || typeof item.name !== "string"
      || typeof item.type !== "string" || typeof item.size !== "number"
    ) {
      throw new Error("El pedido contiene un adjunto con datos inválidos.");
    }
    return { path: item.path, name: item.name, type: item.type, size: item.size };
  });
}

export default async function AdminOrdersPage() {
  if (!getSupabaseConfig()) redirect("/admin/login");

  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("No se pudieron cargar los pedidos:", error.message);
    throw new Error("No se pudo cargar la bandeja de pedidos. Revisá la conexión con Supabase.");
  }

  const orders = data.map((row): Order => {
    if (!statuses.includes(row.status as OrderStatus)) throw new Error("Un pedido tiene un estado desconocido.");
    return {
      ...row,
      status: row.status as OrderStatus,
      attachments: parseAttachments(row.attachments),
    };
  });
  const paths = orders.flatMap((order) => order.attachments.map(({ path }) => path));
  const signedUrlByPath: Record<string, string> = {};
  const downloadUrlByPath: Record<string, string> = {};

  if (paths.length) {
    const storage = supabase.storage.from("order-attachments");
    const [
      { data: signedUrls, error: signedUrlError },
      { data: downloadUrls, error: downloadUrlError },
    ] = await Promise.all([
      storage.createSignedUrls(paths, 300),
      storage.createSignedUrls(paths, 300, { download: true }),
    ]);

    const storageError = signedUrlError ?? downloadUrlError;
    if (storageError) {
      console.error("No se pudieron generar enlaces seguros para los adjuntos:", storageError.message);
      throw new Error("No se pudieron abrir los archivos de los pedidos. Revisá las políticas de Storage.");
    }

    for (const signed of signedUrls ?? []) {
      if (signed.error) {
        console.error("No se pudo generar un enlace seguro para un adjunto:", signed.error);
        throw new Error("No se pudieron abrir los archivos de los pedidos. Revisá las políticas de Storage.");
      }
      if (signed.path && signed.signedUrl) signedUrlByPath[signed.path] = signed.signedUrl;
    }
    for (const signed of downloadUrls ?? []) {
      if (signed.error) {
        console.error("No se pudo generar un enlace de descarga para un adjunto:", signed.error);
        throw new Error("No se pudieron descargar los archivos de los pedidos. Revisá las políticas de Storage.");
      }
      if (signed.path && signed.signedUrl) downloadUrlByPath[signed.path] = signed.signedUrl;
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin">
          <BrandMark className="admin-brand-mark" />
          <span>OLAVARRIA 3D <span className="muted">/ ADMIN</span></span>
        </Link>
        <div className="admin-top-actions">
          <span>{user.email}</span>
          <Link className="admin-link" href="/admin">Productos</Link>
          <a className="admin-link" href="/pedidos" target="_blank" rel="noreferrer">Ver formulario ↗</a>
          <form action={signOutAction}><button className="admin-button-secondary" type="submit">Cerrar sesión</button></form>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="admin-eyebrow">BANDEJA DE ENTRADA / A MEDIDA</p>
            <h1>Pedidos</h1>
            <p className="admin-subtitle">Revisá las ideas que envían tus clientes y actualizá su estado.</p>
          </div>
          <span className="admin-product-count">{orders.length} {orders.length === 1 ? "pedido" : "pedidos"}</span>
        </div>
        <AdminOrders
          orders={orders}
          signedUrlByPath={signedUrlByPath}
          downloadUrlByPath={downloadUrlByPath}
        />
      </main>
    </div>
  );
}
