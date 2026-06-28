import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    include: { products: { where: { active: true }, orderBy: { name: "asc" } } },
  });
  if (!category) notFound();

  return (
    <>
      <h1>{category.name}</h1>
      {category.products.length === 0 ? (
        <p>No products in this category.</p>
      ) : (
        <div className="grid">
          {category.products.map((p) => (
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
