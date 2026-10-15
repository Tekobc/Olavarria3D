"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { BUSINESS } from "@/lib/business";
import { createClient } from "@/lib/supabase/browser";
import { createOrderAction } from "@/app/pedidos/actions";
import type { OrderAttachment, OrderEmailStatus } from "@/lib/types";

type SelectedAttachment = OrderAttachment & { id: string; file: File; preview: string | null };

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  stl: "model/stl",
  obj: "model/obj",
  "3mf": "model/3mf",
  step: "model/step",
  stp: "model/step",
};

function extensionOf(filename: string) {
  return filename.split(".").pop()?.toLocaleLowerCase("en-US") ?? "";
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PedidoForm() {
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [primaryId, setPrimaryId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [emailStatus, setEmailStatus] = useState<OrderEmailStatus | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => () => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
  }, []);

  function addFiles(selected: File[]) {
    if (!selected.length) return;

    const issue = selected.find((file) => {
      const extension = extensionOf(file.name);
      return !MIME_BY_EXTENSION[extension]
        || file.size > MAX_FILE_SIZE
        || file.size === 0;
    });

    if (issue) {
      setMessage(MIME_BY_EXTENSION[extensionOf(issue.name)]
        ? `${issue.name} supera los 10 MB o está vacío.`
        : `${issue.name} tiene un formato no admitido.`);
      setMessageType("error");
      return;
    }
    if (attachments.length + selected.length > MAX_FILES) {
      setMessage(`Podés adjuntar hasta ${MAX_FILES} archivos.`);
      setMessageType("error");
      return;
    }
    const totalSize = [...attachments.map(({ size }) => size), ...selected.map(({ size }) => size)]
      .reduce((total, size) => total + size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setMessage("El total de los archivos no puede superar los 25 MB.");
      setMessageType("error");
      return;
    }

    const added = selected.map((file) => {
      const extension = extensionOf(file.name);
      const preview = ["jpg", "jpeg", "png", "webp"].includes(extension)
        ? URL.createObjectURL(file)
        : null;
      if (preview) objectUrls.current.add(preview);
      return {
        id: crypto.randomUUID(),
        file,
        path: "",
        name: file.name,
        type: MIME_BY_EXTENSION[extension],
        size: file.size,
        preview,
      };
    });
    const firstImage = added.find((attachment) => attachment.preview);
    if (!attachments.length) setPrimaryId(firstImage?.id ?? added[0]?.id ?? "");
    else if (!attachments.some((attachment) => attachment.preview) && firstImage) setPrimaryId(firstImage.id);
    setAttachments((current) => [...current, ...added]);
    setMessage("");
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    addFiles(selected);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!submitting) setDragOver(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (!submitting) addFiles(Array.from(event.dataTransfer.files));
  }

  function removeAttachment(id: string) {
    const removed = attachments.find((attachment) => attachment.id === id);
    if (removed?.preview) {
      URL.revokeObjectURL(removed.preview);
      objectUrls.current.delete(removed.preview);
    }
    const remaining = attachments.filter((attachment) => attachment.id !== id);
    setAttachments(remaining);
    if (primaryId === id) setPrimaryId(remaining[0]?.id ?? "");
    setMessage("");
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setMessage("");
    setEmailStatus(null);
    setWhatsappUrl("");

    try {
      const orderId = crypto.randomUUID();
      const supabase = createClient();
      const uploaded: OrderAttachment[] = [];

      for (const attachment of attachments) {
        const path = `orders/${orderId}/${crypto.randomUUID()}.${extensionOf(attachment.name)}`;
        const { error } = await supabase.storage
          .from("order-attachments")
          .upload(path, attachment.file, {
            cacheControl: "3600",
            contentType: attachment.type,
            upsert: false,
          });
        if (error) {
          console.error("No se pudo cargar un archivo del pedido:", error.message);
          throw new Error(`No se pudo cargar “${attachment.name}”. Revisá tu conexión e intentá enviar el pedido otra vez.`);
        }
        uploaded.push({
          path,
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
        });
      }

      const formData = new FormData(form);
      const customerName = String(formData.get("customer_name") ?? "");
      const contact = String(formData.get("contact") ?? "");
      const details = String(formData.get("details") ?? "");
      formData.set("id", orderId);
      formData.set("attachments", JSON.stringify(uploaded));
      const result = await createOrderAction(formData);
      setMessage(result.message);
      setMessageType(result.ok ? "success" : "error");
      if (result.ok) {
        setEmailStatus(result.emailStatus);
        const whatsappText = [
          "Hola Olavarria 3D, acabo de enviar un pedido desde la web.",
          `Referencia: ${result.orderId}`,
          `Nombre: ${customerName}`,
          `Contacto: ${contact}`,
          "",
          "Detalle:",
          details,
          attachments.length
            ? `Archivos adjuntos: ${attachments.map(({ name }) => name).join(", ")}.`
            : "",
          result.emailStatus === "sent"
            ? `El pedido y los archivos también fueron enviados a ${BUSINESS.orderEmail}.`
            : "",
        ].filter(Boolean).join("\n");
        setWhatsappUrl(
          `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(whatsappText)}`,
        );
        for (const url of objectUrls.current) URL.revokeObjectURL(url);
        objectUrls.current.clear();
        setAttachments([]);
        setPrimaryId("");
        form.reset();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el pedido. Probá nuevamente.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  const primary = attachments.find((attachment) => attachment.id === primaryId) ?? attachments[0];
  const remaining = attachments.filter((attachment) => attachment.id !== primary?.id);

  return (
    <form className="order-form-card" onSubmit={submitOrder}>
      <div className="order-form-heading">
        <span className="order-step">TU PEDIDO</span>
        <h2>¿Qué tenés en mente?</h2>
        <p>Completá tus datos y te responderemos para avanzar.</p>
      </div>
      <div className="order-fields">
        <label className="admin-field">
          Tu nombre *
          <input autoComplete="name" maxLength={100} name="customer_name" placeholder="¿Cómo te llamás?" required />
        </label>
        <label className="admin-field">
          ¿Cómo te contactamos? *
          <input autoComplete="off" maxLength={160} name="contact" placeholder="WhatsApp o correo electrónico" required />
          <small>Dejanos el medio que te resulte más cómodo.</small>
        </label>
        <label className="admin-field">
          Contanos qué necesitás *
          <textarea
            maxLength={3000}
            minLength={10}
            name="details"
            placeholder="¿Qué querés hacer? Contanos medidas, uso, cantidad o cualquier detalle que nos ayude."
            required
            rows={5}
          />
        </label>
      </div>

      <section className="order-attachments" aria-labelledby="attachments-title">
        <div className="order-attachments-heading">
          <div>
            <h3 id="attachments-title">Referencias y archivos <span>OPCIONAL</span></h3>
            <p>Fotos, PDF o modelos 3D · hasta 5 archivos · 10 MB cada uno</p>
          </div>
        </div>
        <section
          className={`attachment-dropzone${dragOver ? " is-dragging" : ""}${submitting ? " is-disabled" : ""}`}
          aria-label="Zona para arrastrar archivos adjuntos"
          onDragEnter={handleDragOver}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span className="attachment-drop-icon" aria-hidden="true">↥</span>
          <div>
            <strong>Arrastrá tus archivos acá</strong>
            <p>o elegilos desde tu dispositivo</p>
          </div>
          <label className="attachment-add">
            <input
              accept=".jpg,.jpeg,.png,.webp,.pdf,.stl,.obj,.3mf,.step,.stp"
              disabled={submitting || attachments.length >= MAX_FILES}
              multiple
              onChange={handleFileInput}
              type="file"
            />
            Elegir archivos
          </label>
        </section>
        {attachments.length > 0 && primary && (
          <div className="attachment-gallery">
            <div className={`attachment-primary${primary.preview ? " is-image" : ""}`}>
              {primary.preview ? (
                <Image src={primary.preview} alt={`Vista previa: ${primary.name}`} fill unoptimized sizes="(max-width: 700px) 100vw, 420px" />
              ) : (
                <div className="attachment-file-preview">
                  <span aria-hidden="true">{primary.type === "application/pdf" ? "PDF" : "3D"}</span>
                  <strong>{primary.name}</strong>
                  <small>{formatBytes(primary.size)}</small>
                </div>
              )}
              <button className="attachment-remove attachment-remove-primary" disabled={submitting} onClick={() => removeAttachment(primary.id)} type="button" aria-label={`Quitar ${primary.name}`}>×</button>
            </div>
            <div className="attachment-thumbnails">
              {remaining.map((attachment) => (
                <div className="attachment-thumbnail-wrap" key={attachment.id}>
                  <button
                    aria-label={`Mostrar ${attachment.name} en grande`}
                    className={`attachment-thumbnail${attachment.preview ? " is-image" : ""}`}
                    disabled={submitting}
                    onClick={() => setPrimaryId(attachment.id)}
                    type="button"
                  >
                    {attachment.preview ? (
                      <Image src={attachment.preview} alt="" fill unoptimized sizes="100px" />
                    ) : (
                      <span>{attachment.type === "application/pdf" ? "PDF" : "3D"}</span>
                    )}
                  </button>
                  <button className="attachment-remove" disabled={submitting} onClick={() => removeAttachment(attachment.id)} type="button" aria-label={`Quitar ${attachment.name}`}>×</button>
                  <small title={attachment.name}>{attachment.name}</small>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="attachment-total">{attachments.length}/{MAX_FILES} archivos · {formatBytes(attachments.reduce((total, attachment) => total + attachment.size, 0))} de 25 MB</p>
      </section>

      {message && <div className={`form-message${messageType === "success" ? " success" : ""}`} role={messageType === "success" ? "status" : "alert"}>{message}</div>}
      {messageType === "success" && whatsappUrl && (
        <div className="order-delivery-options">
          <p>
            {emailStatus === "sent"
              ? "El correo con los adjuntos ya fue enviado. Si preferís, también podés continuar por WhatsApp."
              : "Podés continuar por WhatsApp. Los archivos del pedido quedaron guardados para que podamos revisarlos."}
          </p>
          <a
            className="button order-whatsapp-button"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Continuar por WhatsApp <span aria-hidden="true">↗</span>
          </a>
          <small>
            WhatsApp abre el mensaje preparado; revisalo y tocá enviar. Si el correo automático no está disponible, adjuntá los archivos manualmente en el chat.
          </small>
        </div>
      )}
      <button className="button button-primary order-submit" disabled={submitting} type="submit">
        {submitting ? "Enviando pedido…" : "Enviar pedido"}
        <span aria-hidden="true">{submitting ? "…" : "↗"}</span>
      </button>
      <p className="order-privacy">Usaremos tus datos y archivos únicamente para responder esta consulta. Los adjuntos se comparten por email con Olavarria 3D. También podés escribirnos por <a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>.</p>
    </form>
  );
}
