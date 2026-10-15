import Link from "next/link";
import { BrandMark } from "@/app/components/BrandMark";
import { PedidoForm } from "@/app/components/PedidoForm";
import { BUSINESS } from "@/lib/business";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = {
  title: "Hacer un pedido",
  description: "Contanos qué necesitás y adjuntá imágenes o archivos para tu proyecto de impresión 3D.",
};

export default function PedidosPage() {
  const configured = Boolean(getSupabaseConfig());

  return (
    <main className="order-page">
      <header className="site-header">
        <div className="shell nav">
          <Link className="brand" href="/" aria-label="Olavarria 3D, inicio">
            <BrandMark className="brand-symbol" />
            <span>OLAVARRIA <b>3D</b></span>
          </Link>
          <Link className="nav-cta" href="/">Volver a la tienda <span aria-hidden="true">↗</span></Link>
        </div>
      </header>
      <div className="shell order-layout">
        <section className="order-intro">
          <p className="eyebrow eyebrow-dark">PEDIDOS A MEDIDA</p>
          <h1>Contanos tu <em>idea.</em></h1>
          <p>Describí lo que necesitás y, si tenés referencias o un modelo, adjuntalos. Enviamos tu pedido y los archivos por correo, y también podés continuar la conversación por WhatsApp.</p>
          <div className="order-reassurance">
            <span aria-hidden="true">01</span>
            <p><strong>Sin compromiso</strong><br />Primero entendemos tu proyecto y después conversamos opciones.</p>
          </div>
        </section>
        {configured ? (
          <PedidoForm />
        ) : (
          <div className="order-form-card form-message info" role="status">
            El formulario de pedidos todavía no está conectado. Podés escribirnos por{" "}
            <a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a>.
          </div>
        )}
      </div>
    </main>
  );
}
