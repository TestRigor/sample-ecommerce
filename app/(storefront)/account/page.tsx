import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <>
        <h1>Account</h1>
        <p>Sign in to view your order history, or create a new account.</p>
        <p>
          <Link className="btn" href="/account/login">
            Sign in
          </Link>{" "}
          <Link href="/account/register">Register</Link>
        </p>
      </>
    );
  }

  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <h1>My Account</h1>
      <p>Signed in as {user.email}.</p>

      <h2>Order history</h2>
      {orders.length === 0 ? (
        <p>You have no orders yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{o.status}</td>
                <td>{formatUsd(o.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
