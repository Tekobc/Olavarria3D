"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Product } from "@/lib/types";
import {
  deleteProductAction,
  saveProductAction,
  setProductVisibilityAction,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/browser";

type ProductEditorProps = {
  product: Product | null;
  imageUrl: string | null;
  onClose: () => void;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function ProductEditor({ product, imageUrl, onClose }: ProductEditorProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(imageUrl);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "info">("error");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function onSelectImage(selected: File | undefined) {
    if (!selected) return;
    if (!IMAGE_TYPES[selected.type]) {
      setFile(null);
      setPreview(imageUrl);
      setMessage("Usá una imagen JPG, PNG o WebP.");
      setMessageType("error");
      return;
    }
    if (selected.size > MAX_IMAGE_SIZE) {
      setFile(null);
      setPreview(imageUrl);
      setMessage("La imagen supera el máximo de 5 MB. Elegí una versión más liviana.");
      setMessageType("error");
      return;
    }

    setFile(selected);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(selected));
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    let uploadedPath: string | null = null;

    try {
      if (file) {
        const extension = IMAGE_TYPES[file.type];
        const path = `products/${crypto.randomUUID()}.${extension}`;
        const { error } = await createClient()
          .storage
          .from("product-images")
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (error) throw new Error("No se pudo subir la imagen. Revisá el formato e intentá otra vez.");
        uploadedPath = path;
      }

      const imagePath = removeImage ? "" : uploadedPath ?? product?.image_path ?? "";
      formData.set("image_path", imagePath);
      const result = await saveProductAction(formData);

      if (!result.ok) {
        if (uploadedPath) {
          const { error } = await createClient().storage.from("product-images").remove([uploadedPath]);
          if (error) {
            console.error("No se pudo limpiar la imagen que quedó sin producto:", error.message);
            setMessage(`${result.message} La imagen cargada quedó sin asociar; podés volver a usarla o eliminarla desde Storage.`);
            setMessageType("error");
          } else {
            setMessage(result.message);
            setMessageType("error");
          }
        } else {
          setMessage(result.message);
          setMessageType("error");
        }
        return;
      }

      const previousPath = product?.image_path;
      if (previousPath && previousPath !== imagePath) {
        const { error } = await createClient().storage.from("product-images").remove([previousPath]);
        if (error) {
          console.error("No se pudo eliminar la imagen anterior:", error.message);
          setMessage("El producto se guardó, pero no se pudo eliminar la imagen anterior de Storage.");
          setMessageType("info");
          router.refresh();
          return;
        }
      }

      router.refresh();
      onClose();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ocurrió un error al guardar.";
      setMessage(uploadedPath
        ? `${text} Revisá la lista de productos antes de volver a enviar; la conexión pudo interrumpirse durante el guardado.`
        : text);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-editor-backdrop">
      <section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="admin-editor-head">
          <div>
            <p className="admin-eyebrow">{product ? "EDITAR PUBLICACIÓN" : "NUEVA PUBLICACIÓN"}</p>
            <h2 id="editor-title">{product ? "Editar producto" : "Cargar producto"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose} disabled={saving}>×</button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <input type="hidden" name="id" value={product?.id ?? ""} />
          <input type="hidden" name="image_path" value={product?.image_path ?? ""} />
          <label className="admin-field">
            Nombre del producto *
            <input defaultValue={product?.name ?? ""} maxLength={100} name="name" required />
          </label>
          <label className="admin-field">
            Descripción
            <textarea defaultValue={product?.description ?? ""} maxLength={2000} name="description" placeholder="Contá brevemente qué lo hace especial." />
          </label>
          <div className="admin-form-grid">
            <label className="admin-field">
              Categoría *
              <input defaultValue={product?.category ?? ""} maxLength={60} name="category" placeholder="Ej.: Decoración" required />
            </label>
            <label className="admin-field">
              Precio (ARS)
              <input defaultValue={product?.price ?? ""} min="0" name="price" placeholder="Dejar vacío para consultar" step="0.01" type="number" />
              <small>Vacío = mostrar “Consultar precio”.</small>
            </label>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field">
              Orden en el catálogo
              <input defaultValue={product?.sort_order ?? 0} min="0" max="100000" name="sort_order" type="number" />
            </label>
            <div className="admin-field">
              Imagen del producto
              <div className="upload-area">
                {preview && !removeImage ? (
                  <Image
                    className="upload-preview"
                    src={preview}
                    alt="Vista previa de la imagen seleccionada"
                    width={960}
                    height={640}
                    unoptimized
                  />
                ) : (
                  <div className="upload-prompt">
                    <strong>Sumá una buena foto</strong>
                    JPG, PNG o WebP · hasta 5 MB
                  </div>
                )}
              </div>
              <input accept="image/jpeg,image/png,image/webp" onChange={(event) => onSelectImage(event.target.files?.[0])} type="file" />
              {(product?.image_path || file) && (
                <button
                  className="admin-link"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setRemoveImage(true);
                  }}
                  type="button"
                >
                  Quitar imagen
                </button>
              )}
            </div>
          </div>
          <div className="admin-checks">
            <label className="admin-check">
              <input defaultChecked={product?.featured ?? false} name="featured" type="checkbox" />
              Destacar en el catálogo
            </label>
            <label className="admin-check">
              <input defaultChecked={product?.is_published ?? false} name="is_published" type="checkbox" />
              Publicar ahora
            </label>
          </div>
          {message && <div className={`form-message${messageType === "success" ? " success" : messageType === "info" ? " info" : ""}`} role="status">{message}</div>}
          <div className="editor-actions">
            <button className="admin-button-secondary" disabled={saving} onClick={onClose} type="button">Cancelar</button>
            <button className="admin-button" disabled={saving} type="submit">
              {saving ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function AdminProducts({
  products,
  imageUrls,
}: {
  products: Product[];
  imageUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const publishedCount = products.filter((product) => product.is_published).length;
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-AR");
    return products.filter((product) => {
      const matchesQuery = !normalized
        || `${product.name} ${product.category}`.toLocaleLowerCase("es-AR").includes(normalized);
      const matchesStatus = statusFilter === "all"
        || product.is_published === (statusFilter === "published");
      return matchesQuery && matchesStatus;
    });
  }, [products, query, statusFilter]);

  async function toggleVisibility(product: Product) {
    setBusyId(product.id);
    setMessage("");
    const result = await setProductVisibilityAction(product.id, !product.is_published);
    setMessage(result.message);
    setBusyId("");
    if (result.ok) router.refresh();
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`)) return;
    setBusyId(product.id);
    setMessage("");
    const result = await deleteProductAction(product.id);

    if (result.ok && product.image_path) {
      const { error } = await createClient().storage.from("product-images").remove([product.image_path]);
      if (error) {
        console.error("El producto fue eliminado, pero su imagen sigue en Storage:", error.message);
        setMessage("Producto eliminado. No se pudo quitar su imagen de Storage; podés borrarla desde el panel de Storage.");
      }
    }

    setMessage((current) => current || result.message);
    setBusyId("");
    if (result.ok) router.refresh();
  }

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stat"><span>En catálogo</span><strong>{products.length}</strong></div>
        <div className="admin-stat"><span>Publicados</span><strong>{publishedCount}</strong></div>
        <div className="admin-stat"><span>Borradores</span><strong>{products.length - publishedCount}</strong></div>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o categoría…"
          type="search"
          value={query}
          aria-label="Buscar productos"
        />
        <fieldset className="admin-status-filters">
          <legend className="sr-only">Filtrar por estado</legend>
          <button aria-pressed={statusFilter === "all"} className={statusFilter === "all" ? "selected" : ""} onClick={() => setStatusFilter("all")} type="button">Todos</button>
          <button aria-pressed={statusFilter === "published"} className={statusFilter === "published" ? "selected" : ""} onClick={() => setStatusFilter("published")} type="button">Publicados</button>
          <button aria-pressed={statusFilter === "draft"} className={statusFilter === "draft" ? "selected" : ""} onClick={() => setStatusFilter("draft")} type="button">Borradores</button>
        </fieldset>
        <button className="admin-button" onClick={() => setEditing(null)} type="button">＋ Nuevo producto</button>
      </div>

      {message && <div className="form-message info admin-feedback" role="status">{message}</div>}

      {products.length === 0 ? (
        <div className="admin-empty">
          <h2>Tu catálogo empieza acá.</h2>
          <p>Cargá nombre, categoría y foto. Después podés guardar como borrador o publicar directamente en la tienda.</p>
          <button className="admin-button" onClick={() => setEditing(null)} type="button">Cargar el primer producto</button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-empty"><h2>No encontramos productos.</h2><p>Probá con otro nombre o categoría.</p></div>
      ) : (
        <div className="admin-product-list">
          {filteredProducts.map((product) => (
            <article className="admin-product" key={product.id}>
              <div className="admin-product-image">
                {imageUrls[product.id] ? (
                  <Image src={imageUrls[product.id]} alt="" width={152} height={136} unoptimized />
                ) : "O3"}
              </div>
              <div>
                <h2 className="admin-product-name">{product.name}</h2>
                <div className="admin-product-meta">
                  <span>{product.category}</span>
                  <span>{product.price === null ? "Consultar precio" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(product.price)}</span>
                  <span>Orden {product.sort_order}</span>
                </div>
              </div>
              <div className="admin-product-actions">
                <span className={`status-badge ${product.is_published ? "status-published" : "status-draft"}`}>
                  {product.is_published ? "Publicado" : "Borrador"}
                </span>
                <button className="admin-button-secondary" disabled={busyId === product.id} onClick={() => setEditing(product)} type="button">Editar</button>
                <button className="admin-button-secondary" disabled={busyId === product.id} onClick={() => toggleVisibility(product)} type="button">
                  {product.is_published ? "Ocultar" : "Publicar"}
                </button>
                <button className="admin-button-danger" disabled={busyId === product.id} onClick={() => removeProduct(product)} type="button">Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <ProductEditor
          imageUrl={editing ? imageUrls[editing.id] ?? null : null}
          key={editing?.id ?? "new-product"}
          onClose={() => setEditing(undefined)}
          product={editing}
        />
      )}
    </>
  );
}
