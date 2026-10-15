import { ProductCard } from "@/app/components/ProductCard";
import type { Product } from "@/lib/types";

function shuffleProducts(products: Product[]) {
  const shuffled = [...products];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export function ProductCarousel({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const shuffledProducts = shuffleProducts(products);

  return (
    <section className="product-carousel" aria-label="Productos destacados aleatorios">
      <div className="product-carousel-heading">
        <div>
          <p className="eyebrow eyebrow-dark">UN VISTAZO AL CATÁLOGO</p>
          <h3>Ideas que no paran de <em>girar.</em></h3>
        </div>
        <span>{products.length} {products.length === 1 ? "pieza disponible" : "piezas disponibles"}</span>
      </div>
      <div className="product-carousel-viewport">
        <div className="product-carousel-track">
          {[0, 1].map((copy) => (
            <div
              className="product-carousel-group"
              aria-hidden={copy === 1}
              inert={copy === 1}
              key={copy}
            >
              {shuffledProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={copy === 0 && index < 2}
                  inert={copy === 1}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
