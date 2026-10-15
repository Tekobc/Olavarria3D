import Link from "next/link";
import { BrandMark } from "@/app/components/BrandMark";
import { Catalog } from "@/app/components/Catalog";
import { ProductCarousel } from "@/app/components/ProductCarousel";
import { BUSINESS } from "@/lib/business";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = Boolean(getSupabaseConfig());
  let products: Product[] = [];
  let catalogUnavailable = false;

  if (configured) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_published", true)
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("No se pudo cargar el catálogo público:", error.message);
      catalogUnavailable = true;
    } else {
      products = data;
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="shell nav">
          <Link className="brand" href="/" aria-label="Olavarria 3D, inicio">
            <BrandMark className="brand-symbol" />
            <span>OLAVARRIA <b>3D</b></span>
          </Link>
          <nav className="nav-links" aria-label="Navegación">
            <a href="#catalogo">Catálogo</a>
            <a href="#proceso">Cómo funciona</a>
            <Link href="/simulador">Simulador 3D</Link>
            <Link className="nav-cta" href="/pedidos">Hacer un pedido <span aria-hidden="true">↗</span></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-dark"><span className="status-dot" /> {BUSINESS.name} · impresión 3D</p>
            <h1>Ideas que toman <em>forma.</em></h1>
            <p className="hero-lead">
              Diseñamos y fabricamos piezas en 3D para proyectos, regalos y esas ideas que todavía no existen.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#catalogo">
                Explorá el catálogo <span aria-hidden="true">↓</span>
              </a>
              <Link className="button button-quiet" href="/simulador">Probá el simulador 3D <span aria-hidden="true">↗</span></Link>
              <Link className="button button-quiet" href="/pedidos">Contanos tu idea <span aria-hidden="true">↗</span></Link>
              <a className="button button-quiet" href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">
                Escribinos por Instagram <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="hero-footnote">
              <span className="footnote-line" />
              <span>Una idea, un diseño, una pieza hecha para vos.</span>
            </div>
          </div>
          <div className="hero-visual" role="img" aria-label="Ilustración de una pieza impresa en 3D">
            <div className="visual-grid" />
            <div className="visual-label label-top"><span>FABRICACIÓN</span><b>POR CAPAS</b></div>
            <svg className="hero-object" viewBox="0 0 440 440" role="img" aria-label="Objeto geométrico en impresión 3D">
              <defs>
                <linearGradient id="objectFront" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#72c5ff" />
                  <stop offset="1" stopColor="#1675c9" />
                </linearGradient>
                <linearGradient id="objectSide" x1="0" y1="0" x2="0.9" y2="1">
                  <stop offset="0" stopColor="#3299ed" />
                  <stop offset="1" stopColor="#074c91" />
                </linearGradient>
              </defs>
              <ellipse cx="222" cy="348" rx="130" ry="25" fill="#0d100f" opacity=".35" />
              <path d="M220 83 337 151v135l-117 69-117-69V151z" fill="url(#objectFront)" />
              <path d="m220 83 117 68v135l-117-69z" fill="url(#objectSide)" />
              <path d="m103 151 117 66 117-66M220 217v138" fill="none" stroke="#eaffb3" strokeOpacity=".72" strokeWidth="3" />
              <path d="m143 175 77 44 78-45m-155 66 77 44 78-45m-155 0 77 44 78-45" fill="none" stroke="#63832a" strokeOpacity=".58" strokeWidth="2" />
              <path d="M154 134v-38h68m-67 15h85m-85 15h66" fill="none" stroke="#f4f8ff" strokeWidth="5" strokeLinecap="round" opacity=".82" />
              <circle cx="222" cy="96" r="9" fill="#ffffff" />
              <path d="M220 105v29" stroke="#ffffff" strokeWidth="4" strokeDasharray="3 7" />
            </svg>
            <div className="visual-label label-bottom"><span>OLAVARRIA</span><b>3D / 01</b></div>
            <span className="visual-cross cross-one" aria-hidden="true">+</span>
            <span className="visual-cross cross-two" aria-hidden="true">+</span>
          </div>
          <a className="scroll-cue" href="#catalogo" aria-label="Bajar al catálogo">SCROLL <span>↓</span></a>
        </section>

        <section id="catalogo" className="section shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow-dark">OBJETOS CON OTRA DIMENSIÓN</p>
              <h2>Hecho para <em>imaginar.</em></h2>
            </div>
            <p className="section-intro">
              Piezas impresas en 3D para regalar, resolver o simplemente disfrutar. Cada diseño puede tener su propia historia.
            </p>
          </div>
          {catalogUnavailable ? (
            <div className="catalog-message" role="status">
              No pudimos cargar el catálogo en este momento. Probá de nuevo más tarde o escribinos por Instagram.
            </div>
          ) : !configured ? (
            <div className="catalog-message" role="status">
              Estamos preparando el catálogo. Mientras tanto, podés conocer el emprendimiento en Instagram.
              <a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">Visitar {BUSINESS.instagramHandle} ↗</a>
            </div>
          ) : (
            <>
              <ProductCarousel products={products} />
              <Catalog products={products} />
            </>
          )}
        </section>

        <section id="proceso" className="process-section">
          <div className="shell">
            <div className="section-heading process-heading">
              <div>
                <p className="eyebrow">DE LA IDEA A TUS MANOS</p>
                <h2>Así lo <em>hacemos.</em></h2>
              </div>
              <p className="section-intro">
                ¿Tenés un diseño o apenas una idea? Empezamos por escucharte y vemos juntos cuál es el próximo paso.
              </p>
            </div>
            <ol className="process-steps">
              <li><span>01</span><h3>Contanos</h3><p>Compartí tu idea, una referencia o qué necesitás resolver.</p></li>
              <li><span>02</span><h3>La pensamos</h3><p>Revisamos los detalles y definimos cómo llevarla a una pieza.</p></li>
              <li><span>03</span><h3>La creamos</h3><p>Con el proyecto acordado, empieza el proceso de fabricación.</p></li>
            </ol>
          </div>
        </section>

        <section className="closing-section shell">
          <p className="eyebrow eyebrow-dark">¿TENÉS ALGO EN MENTE?</p>
          <h2>Hagamos lugar<br />para <em>esa idea.</em></h2>
          <a className="button button-dark" href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">
            Hablemos por Instagram <span aria-hidden="true">↗</span>
          </a>
          <Link className="button button-quiet closing-order-link" href="/pedidos">O contanos tu proyecto <span aria-hidden="true">→</span></Link>
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <Link className="brand footer-brand" href="/">
            <BrandMark className="brand-symbol" />
            <span>OLAVARRIA <b>3D</b></span>
          </Link>
          <span>Diseño y fabricación en impresión 3D</span>
          <a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">{BUSINESS.instagramHandle} ↗</a>
        </div>
      </footer>
    </>
  );
}
