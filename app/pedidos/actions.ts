"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendOrderEmail } from "@/app/pedidos/email";
import { BUSINESS } from "@/lib/business";

const attachmentExtensions = ["jpg", "jpeg", "png", "webp", "pdf", "stl", "obj", "3mf", "step", "stp"] as const;
const attachmentMimeTypes: Record<(typeof attachmentExtensions)[number], string> = {
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

function getAttachmentMimeType(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const parsedExtension = z.enum(attachmentExtensions).safeParse(extension);
  return parsedExtension.success ? attachmentMimeTypes[parsedExtension.data] : null;
}

const attachmentSchema = z.object({
  path: z.string().max(180),
  name: z.string().trim().min(1).max(180),
  type: z.string().max(100),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});
const orderSchema = z.object({
  id: z.string().uuid(),
  customer_name: z.string().trim().min(2, "Ingresá tu nombre.").max(100),
  contact: z.string().trim().min(5, "Ingresá un teléfono o correo para poder responderte.").max(160),
  details: z.string().trim().min(10, "Contanos un poco más sobre lo que necesitás.").max(3000),
  attachments: z.array(attachmentSchema).max(5),
});

export async function createOrderAction(formData: FormData) {
  let attachments: unknown;
  try {
    attachments = JSON.parse(String(formData.get("attachments") ?? "[]"));
  } catch {
    return { ok: false as const, message: "No pudimos validar los archivos adjuntos." };
  }

  const parsed = orderSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    customer_name: String(formData.get("customer_name") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    details: String(formData.get("details") ?? ""),
    attachments,
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Revisá los datos del pedido.",
    };
  }

  const validPaths = parsed.data.attachments.every(({ path, name, type }) => {
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    const pathMatches = new RegExp(
      `^orders/${parsed.data.id}/[0-9a-f-]{36}\\.(${attachmentExtensions.join("|")})$`,
      "i",
    ).test(path);
    return type === getAttachmentMimeType(name)
      && pathMatches
      && path.toLowerCase().endsWith(`.${extension}`);
  });
  const totalAttachmentSize = parsed.data.attachments.reduce(
    (total, attachment) => total + attachment.size,
    0,
  );

  if (!validPaths) {
    return { ok: false as const, message: "Uno de los archivos adjuntos no es válido." };
  }
  if (totalAttachmentSize > 25 * 1024 * 1024) {
    return { ok: false as const, message: "El total de los archivos no puede superar los 25 MB." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").insert({
    id: parsed.data.id,
    customer_name: parsed.data.customer_name,
    contact: parsed.data.contact,
    details: parsed.data.details,
    attachments: parsed.data.attachments,
    status: "received",
  });

  if (error) {
    console.error("No se pudo registrar el pedido:", error.message);
    return {
      ok: false as const,
      message: "No pudimos enviar el pedido. Probá nuevamente o escribinos por Instagram.",
    };
  }

  revalidatePath("/admin/pedidos");
  const emailStatus = await sendOrderEmail({
    id: parsed.data.id,
    customerName: parsed.data.customer_name,
    contact: parsed.data.contact,
    details: parsed.data.details,
    attachments: parsed.data.attachments,
  });

  const emailMessage = emailStatus === "sent"
    ? `También enviamos el pedido y sus archivos a ${BUSINESS.orderEmail}.`
    : emailStatus === "not_configured"
      ? "El pedido quedó guardado, pero el correo automático todavía no está configurado."
      : "El pedido quedó guardado, pero no pudimos enviar el correo automático.";

  return {
    ok: true as const,
    message: `Recibimos tu pedido. ${emailMessage}`,
    emailStatus,
    orderId: parsed.data.id,
  };
}
