"use client";

import { useMemo, useState } from "react";
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

export function Catalog({ products }: { products: Product[] }) {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => product.category)))],
    [products],
  );
  const filteredProducts = activeCategory === "Todos"
    ? products
    : products.filter((product) => product.category === activeCategory);

  if (products.length === 0) {
    return (
      <div className="catalog-message">
        Estamos preparando nuevas piezas para el catálogo.
        <a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">Consultanos por Instagram ↗</a>
      </div>
    );
  }

  return (
    <>
      <fieldset className="catalog-filters">
        <legend className="sr-only">Filtrar catálogo</legend>
        {categories.map((category) => (
          <button
            aria-pressed={activeCategory === category}
            className={`filter-chip${activeCategory === category ? " active" : ""}`}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </fieldset>
      <div className="catalog-grid" aria-live="polite">
        {filteredProducts.map((product, index) => {
          const imageUrl = getImageUrl(product.image_path);

          return (
            <article className={`product-card${index === 0 ? " product-card-featured" : ""}`} key={product.id}>
              <a
                className="product-image"
                href={BUSINESS.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Consultar por ${product.name} en Instagram`}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    width={900}
                    height={780}
                    sizes="(max-width: 580px) 100vw, (max-width: 820px) 50vw, 33vw"
                    unoptimized
                    priority={index === 0}
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
                <a className="product-link" href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">
                  Consultar pieza <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
