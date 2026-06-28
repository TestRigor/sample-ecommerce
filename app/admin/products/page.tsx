import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminNav />
      <main>
        <h1>Products</h1>
        <p>
          <Link className="btn" href="/admin/products/new">
            New Product
          </Link>
        </p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              {/* "Inventory" not "Stock": the test's `grab value from "Stock"`
                  must only ever match the editor's stock readout. A literal
                  "Stock" column header here is a competing match that the grab
                  hits when navigation into the editor lags. */}
              <th>Inventory</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`}>{p.name}</Link>
                </td>
                <td>{p.category.name}</td>
                <td>{formatUsd(p.priceCents)}</td>
                <td>{p.stock}</td>
                <td>{p.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
