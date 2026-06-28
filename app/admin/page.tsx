import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [pending, paid, processing, shipped, lowStock] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.order.count({ where: { status: "SHIPPED" } }),
    prisma.product.count({ where: { stock: { lte: 5 } } }),
  ]);

  return (
    <>
      <AdminNav />
      <main>
        <h1>Dashboard</h1>
        <div className="grid">
          <div className="card">{paid} Paid</div>
          <div className="card">{pending} Pending</div>
          <div className="card">{processing} Processing</div>
          <div className="card">{shipped} Shipped</div>
          <div className="card">{lowStock} Low-stock products</div>
        </div>
      </main>
    </>
  );
}
