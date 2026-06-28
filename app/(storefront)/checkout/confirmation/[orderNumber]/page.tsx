import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: { orderNumber: string };
}) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { items: true },
  });
  if (!order) notFound();

  const shipping = JSON.parse(order.shipping || "{}");

  return (
    <>
      <h1>Thank you for your purchase!</h1>
      <p>
        Your order number is <strong>{order.orderNumber}</strong>.
      </p>
      <p>A confirmation email has been sent to {order.email}.</p>

      <h2>Order summary</h2>
      <ul>
        {order.items.map((i) => (
          <li key={i.id}>
            {i.quantity} × {i.productName} — {formatUsd(i.priceCents * i.quantity)}
          </li>
        ))}
      </ul>
      <p>Subtotal: {formatUsd(order.subtotalCents)}</p>
      <p>Shipping: {formatUsd(order.shippingCents)}</p>
      <p>Tax: {formatUsd(order.taxCents)}</p>
      <p>
        <strong>Total: {formatUsd(order.totalCents)}</strong>
      </p>

      <h2>Shipping to</h2>
      <p>
        {shipping.fullName}
        <br />
        {shipping.line1}
        {shipping.line2 ? (
          <>
            <br />
            {shipping.line2}
          </>
        ) : null}
        <br />
        {shipping.city}, {shipping.state} {shipping.postalCode}
        <br />
        {shipping.country}
      </p>

      <Link className="btn" href="/">
        Continue shopping
      </Link>
    </>
  );
}
