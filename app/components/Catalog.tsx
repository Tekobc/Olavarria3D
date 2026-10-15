"use client";

import { useMemo, useState } from "react";
import { BUSINESS } from "@/lib/business";
import { ProductCard } from "@/app/components/ProductCard";
import type { Product } from "@/lib/types";

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
        {filteredProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index === 0} />
        ))}
      </div>
    </>
  );
}
