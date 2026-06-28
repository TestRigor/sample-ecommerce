import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";
import { addToCartAction } from "@/app/actions/cart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { category: true },
  });
  if (!product || !product.active) notFound();

  const inStock = product.stock > 0;

  return (
    <article style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
      <img
        src={product.imageUrl}
        alt={product.name}
        style={{ width: 360, maxWidth: "100%", borderRadius: 8 }}
      />
      <div style={{ flex: 1, minWidth: 280 }}>
        <h1>{product.name}</h1>
        <p>
          <Link href={`/category/${product.category.slug}`}>{product.category.name}</Link>
        </p>
        <p style={{ fontSize: "1.4rem", fontWeight: 600 }}>{formatUsd(product.priceCents)}</p>
        <p>{product.description}</p>
        <p>{inStock ? `In stock: ${product.stock} available` : "Out of stock"}</p>

        <form action={addToCartAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
          <label style={{ maxWidth: 120 }}>
            Quantity
            <input
              type="number"
              name="quantity"
              defaultValue={1}
              min={1}
              max={Math.max(1, product.stock)}
              disabled={!inStock}
            />
          </label>
          <button type="submit" disabled={!inStock}>
            Add to Cart
          </button>
        </form>
      </div>
    </article>
  );
}
