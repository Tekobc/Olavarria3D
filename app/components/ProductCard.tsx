"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const [showDetails, setShowDetails] = useState(false);

  return (
    <article className="product-card">
      <button
        className="product-image"
        type="button"
        aria-label={`Ver detalles de ${product.name}`}
        onClick={() => setShowDetails(true)}
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
        <span className="image-arrow" aria-hidden="true">＋</span>
      </button>
      <div className="product-info">
        <div className="product-title-row">
          <span className="product-category">{product.category}</span>
          <span className="product-price">{formatPrice(product.price)}</span>
        </div>
        <h3>
          <button
            className="product-title-button"
            type="button"
            onClick={() => setShowDetails(true)}
            tabIndex={tabIndex}
          >
            {product.name}
          </button>
        </h3>
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
      {showDetails && (
        <ProductDetailsDialog
          product={product}
          imageUrl={imageUrl}
          onClose={() => setShowDetails(false)}
        />
      )}
    </article>
  );
}

function ProductDetailsDialog({
  product,
  imageUrl,
  onClose,
}: {
  product: Product;
  imageUrl: string | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      className="product-dialog"
      ref={dialogRef}
      aria-labelledby={`product-dialog-title-${product.id}`}
      onClose={onClose}
    >
      <div className="product-dialog-layout">
        <div className="product-dialog-image">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              width={1200}
              height={1000}
              sizes="(max-width: 720px) 90vw, 48vw"
              unoptimized
            />
          ) : (
            <span className="image-placeholder" aria-hidden="true">O<span>3</span></span>
          )}
        </div>
        <div className="product-dialog-content">
          <button
            className="product-dialog-close"
            type="button"
            aria-label="Cerrar detalles"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
          <p className="product-category">{product.category}</p>
          <h2 id={`product-dialog-title-${product.id}`}>{product.name}</h2>
          <p className="product-dialog-price">{formatPrice(product.price)}</p>
          <p className="product-dialog-description">
            {product.description || "Consultanos para conocer más detalles de esta pieza."}
          </p>
          <a
            className="button button-primary product-dialog-contact"
            href={BUSINESS.instagramUrl}
            target="_blank"
            rel="noreferrer"
          >
            Consultar pieza <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </dialog>
  );
}
