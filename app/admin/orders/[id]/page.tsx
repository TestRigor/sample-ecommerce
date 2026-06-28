import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";
import { updateOrderAction } from "@/app/actions/admin";
import AdminNav from "../../AdminNav";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, events: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();

  const shipping = JSON.parse(order.shipping || "{}");
  const billing = JSON.parse(order.billing || "{}");

  return (
    <>
      <AdminNav />
      <main>
        <h1>Order {order.orderNumber}</h1>
        <p>
          Status: <span className="badge">{statusLabel(order.status)}</span>
        </p>
        <p>Contact: {order.email}</p>
        <p>Payment: {statusLabel(order.paymentStatus)}</p>

        {searchParams.error === "tracking" ? (
          <p role="alert" style={{ color: "#b00020", fontWeight: 600 }}>
            Carrier and Tracking Number are required to mark an order Shipped.
          </p>
        ) : null}

        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Unit price</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.productName}</td>
                <td>{formatUsd(i.priceCents)}</td>
                <td>{i.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong>Total: {formatUsd(order.totalCents)}</strong>
        </p>

        <h2>Shipping address</h2>
        <p>
          {shipping.fullName}, {shipping.line1}, {shipping.city}, {shipping.state}{" "}
          {shipping.postalCode}, {shipping.country}
        </p>
        <h2>Billing address</h2>
        <p>
          {billing.fullName}, {billing.line1}, {billing.city}, {billing.state} {billing.postalCode},{" "}
          {billing.country}
        </p>

        <h2>Fulfillment</h2>
        <form action={updateOrderAction}>
          <input type="hidden" name="id" value={order.id} />
          <label>
            Carrier
            <input type="text" name="carrier" defaultValue={order.carrier ?? ""} />
          </label>
          <label>
            Tracking Number
            <input type="text" name="trackingNumber" defaultValue={order.trackingNumber ?? ""} />
          </label>
          <label>
            Update Status
            <select name="status" defaultValue={order.status}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Save</button>
        </form>

        <h2>Event log</h2>
        <ul>
          {order.events.map((e) => (
            <li key={e.id}>
              [{e.type}] {e.message}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
