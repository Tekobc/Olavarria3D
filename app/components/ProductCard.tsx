import Image from "next/image";
import { BUSINESS } from "@/lib/business";
import type { Product } from "@/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getImageUrl(path: string | null) {
  if (!SUPABASE_URL || !path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${encodedPath}`;
}

function formatPrice(price: number | null) {
  if (price === null) return "Consultar precio";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(price);
}

export function ProductCard({
  product,
  priority = false,
  inert = false,
}: {
  product: Product;
  priority?: boolean;
  inert?: boolean;
}) {
  const imageUrl = getImageUrl(product.image_path);
  const tabIndex = inert ? -1 : undefined;

  return (
    <article className="product-card">
      <a
        className="product-image"
        href={BUSINESS.instagramUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Consultar por ${product.name} en Instagram`}
        tabIndex={tabIndex}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={900}
            height={780}
            sizes="(max-width: 580px) 82vw, (max-width: 820px) 42vw, 27vw"
            unoptimized
            priority={priority}
          />
        ) : (
          <span className="image-placeholder" aria-hidden="true">O<span>3</span></span>
        )}
        {product.featured && <span className="featured-label">DESTACADO</span>}
        <span className="image-arrow" aria-hidden="true">↗</span>
      </a>
      <div className="product-info">
        <div className="product-title-row">
          <span className="product-category">{product.category}</span>
          <span className="product-price">{formatPrice(product.price)}</span>
        </div>
        <h3>{product.name}</h3>
        {product.description && <p>{product.description}</p>}
        <a
          className="product-link"
          href={BUSINESS.instagramUrl}
          target="_blank"
          rel="noreferrer"
          tabIndex={tabIndex}
        >
          Consultar pieza <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
