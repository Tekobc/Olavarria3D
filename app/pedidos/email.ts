import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { BUSINESS } from "@/lib/business";
import type { OrderAttachment, OrderEmailStatus } from "@/lib/types";

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

function safeFilename(filename: string) {
  return filename.replace(/[\\/\r\n"]/g, "_");
}

export async function sendOrderEmail(
  order: {
    id: string;
    customerName: string;
    contact: string;
    details: string;
    attachments: OrderAttachment[];
  },
): Promise<OrderEmailStatus> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.RESEND_FROM_EMAIL;

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !senderEmail) {
    return "not_configured";
  }

  try {
    const storageClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const emailAttachments: { filename: string; content: Buffer; contentType: string }[] = [];

    for (const attachment of order.attachments) {
      const { data, error } = await storageClient.storage
        .from("order-attachments")
        .download(attachment.path);

      if (error || !data) {
        console.error("No se pudo descargar un adjunto privado para el correo:", error?.message);
        return "failed";
      }

      const extension = attachment.name.split(".").pop()?.toLowerCase() ?? "";
      const contentType = MIME_BY_EXTENSION[extension];
      if (!contentType) {
        console.error("Se rechazó un adjunto de pedido con extensión no admitida.");
        return "failed";
      }

      emailAttachments.push({
        filename: safeFilename(attachment.name),
        content: Buffer.from(await data.arrayBuffer()),
        contentType,
      });
    }

    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: `Olavarria 3D <${senderEmail}>`,
      to: [BUSINESS.orderEmail],
      subject: "Nuevo pedido de impresión 3D",
      text: [
        "Llegó un nuevo pedido desde la web de Olavarria 3D.",
        "",
        `Referencia: ${order.id}`,
        `Nombre: ${order.customerName}`,
        `Contacto: ${order.contact}`,
        "",
        "Detalle del pedido:",
        order.details,
        "",
        emailAttachments.length
          ? `Se adjuntan ${emailAttachments.length} archivo(s).`
          : "El cliente no adjuntó archivos.",
      ].join("\n"),
      attachments: emailAttachments,
    });

    if (error) {
      console.error("Resend no pudo entregar la notificación del pedido:", error.message);
      return "failed";
    }

    return "sent";
  } catch (error) {
    console.error("No se pudo enviar el correo del pedido:", error);
    return "failed";
  }
}
