import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <AdminNav />
      <main>
        <h1>Orders</h1>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order number</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tracking</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
                  </td>
                  <td>{o.createdAt.toISOString().slice(0, 10)}</td>
                  <td>{o.email}</td>
                  <td>{formatUsd(o.totalCents)}</td>
                  <td>
                    <span className="badge">{statusLabel(o.status)}</span>
                  </td>
                  <td>{o.trackingNumber || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
