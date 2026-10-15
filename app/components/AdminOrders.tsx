"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatusAction } from "@/app/admin/actions";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Nuevo",
  reviewing: "En revisión",
  quoted: "Presupuestado",
  in_progress: "En producción",
  completed: "Entregado",
  cancelled: "Cancelado",
};
const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [OrderStatus, string][];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminOrders({
  orders,
  signedUrlByPath,
  downloadUrlByPath,
}: {
  orders: Order[];
  signedUrlByPath: Record<string, string>;
  downloadUrlByPath: Record<string, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-AR");
    return orders.filter((order) => (
      (statusFilter === "all" || order.status === statusFilter)
      && (!normalized || `${order.customer_name} ${order.contact} ${order.details}`.toLocaleLowerCase("es-AR").includes(normalized))
    ));
  }, [orders, query, statusFilter]);

  async function changeStatus(order: Order, status: OrderStatus) {
    setBusyId(order.id);
    setMessage("");
    const result = await updateOrderStatusAction(order.id, status);
    setMessage(result.message);
    setBusyId("");
    if (result.ok) router.refresh();
  }

  return (
    <>
      <div className="admin-toolbar order-admin-toolbar">
        <input
          aria-label="Buscar pedidos"
          className="admin-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, contacto o detalle…"
          type="search"
          value={query}
        />
        <label className="admin-field order-filter-label">
          Estado
          <select onChange={(event) => setStatusFilter(event.target.value as "all" | OrderStatus)} value={statusFilter}>
            <option value="all">Todos los estados</option>
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {message && <div className="form-message info admin-feedback" role="status">{message}</div>}
      {orders.length === 0 ? (
        <div className="admin-empty">
          <h2>Todavía no hay pedidos.</h2>
          <p>Cuando alguien envíe el formulario, vas a encontrar su consulta y sus archivos en esta bandeja.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-empty"><h2>No encontramos pedidos.</h2><p>Probá con otro texto o estado.</p></div>
      ) : (
        <div className="admin-order-list">
          {filteredOrders.map((order) => (
            <article className="admin-order" key={order.id}>
              <div className="admin-order-head">
                <div>
                  <span className={`status-badge status-order-${order.status}`}>{STATUS_LABELS[order.status]}</span>
                  <h2>{order.customer_name}</h2>
                  <p className="admin-order-contact">{order.contact}</p>
                  <p className="admin-order-id">
                    ID del pedido <code>{order.id}</code>
                  </p>
                </div>
                <div className="admin-order-controls">
                  <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                  <label className="admin-field">
                    Estado del pedido
                    <select
                      disabled={busyId === order.id}
                      onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}
                      value={order.status}
                    >
                      {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <p className="admin-order-details">{order.details}</p>
              {order.attachments.length > 0 ? (
                <section className="admin-order-attachments" aria-label="Archivos adjuntos">
                  {[...order.attachments.filter((attachment) => attachment.type.startsWith("image/")), ...order.attachments.filter((attachment) => !attachment.type.startsWith("image/"))].map((attachment, index) => {
                    const url = signedUrlByPath[attachment.path];
                    const downloadUrl = downloadUrlByPath[attachment.path];
                    const isImage = attachment.type.startsWith("image/");
                    return (
                      <div className={`admin-order-attachment-wrap${index === 0 ? " attachment-large" : ""}`} key={attachment.path}>
                        <a
                          className={`admin-order-attachment${index === 0 ? " attachment-large" : ""}`}
                          href={url}
                          rel="noreferrer"
                          target="_blank"
                          title={`Previsualizar ${attachment.name}`}
                        >
                          {url && isImage ? (
                            <Image alt={attachment.name} fill sizes={index === 0 ? "240px" : "90px"} src={url} unoptimized />
                          ) : (
                            <span className="admin-order-file-icon">{attachment.type === "application/pdf" ? "PDF" : "3D"}</span>
                          )}
                          <span className="admin-order-file-name">{attachment.name}<small>{formatBytes(attachment.size)}</small></span>
                        </a>
                        {downloadUrl ? (
                          <a
                            className="admin-order-download"
                            href={downloadUrl}
                            download={attachment.name}
                            aria-label={`Descargar ${attachment.name} del pedido ${order.id}`}
                          >
                            Descargar
                          </a>
                        ) : (
                          <span className="admin-order-download-unavailable">Descarga no disponible</span>
                        )}
                      </div>
                    );
                  })}
                </section>
              ) : (
                <p className="admin-order-no-attachments">Este pedido no tiene archivos adjuntos.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
