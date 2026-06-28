import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").trim();

  if (!q) {
    return (
      <>
        <h1>Search</h1>
        <p>Please enter a search term to find products.</p>
      </>
    );
  }

  const all = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  const needle = q.toLowerCase();
  const products = all.filter(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      p.description.toLowerCase().includes(needle)
  );

  return (
    <>
      <h1>Results for "{q}"</h1>
      <p>{products.length} result(s) found.</p>
      {products.length === 0 ? (
        <p>No products found for "{q}".</p>
      ) : (
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
      )}
    </>
  );
}
