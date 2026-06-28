import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <h1>Featured products</h1>
      <nav style={{ margin: "0.5rem 0 1.5rem" }}>
        <strong>Categories:</strong>{" "}
        {categories.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} style={{ marginRight: "0.75rem" }}>
            {c.name}
          </Link>
        ))}
      </nav>
      <div className="grid">
        {products.map((p) => (
          <div className="card" key={p.id}>
            <img src={p.imageUrl} alt={p.name} />
            <h3>
              <Link href={`/product/${p.slug}`}>{p.name}</Link>
            </h3>
            <p>{formatUsd(p.priceCents)}</p>
          </div>
        ))}
      </div>
    </>
  );
}
