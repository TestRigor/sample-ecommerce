import Link from "next/link";
import { getCartItems } from "@/lib/cart";
import { formatUsd } from "@/lib/money";
import { updateCartItemAction, removeCartItemAction } from "@/app/actions/cart";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const items = await getCartItems();
  const subtotal = items.reduce((s, i) => s + i.product.priceCents * i.quantity, 0);

  if (items.length === 0) {
    return (
      <>
        <h1>Your cart</h1>
        <p>Your cart is empty.</p>
        <Link className="btn" href="/">
          Continue shopping
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>Your cart</h1>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Unit price</th>
            <th>Quantity</th>
            <th>Line total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.product.name}</td>
              <td>{formatUsd(i.product.priceCents)}</td>
              <td>
                <form action={updateCartItemAction} style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="hidden" name="itemId" value={i.id} />
                  <input
                    type="number"
                    name="quantity"
                    defaultValue={i.quantity}
                    min={1}
                    max={i.product.stock}
                    style={{ width: 70 }}
                    aria-label={`Quantity for ${i.product.name}`}
                  />
                  <button type="submit">Update</button>
                </form>
              </td>
              <td>{formatUsd(i.product.priceCents * i.quantity)}</td>
              <td>
                <form action={removeCartItemAction}>
                  <input type="hidden" name="itemId" value={i.id} />
                  <button type="submit">Remove</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Subtotal: {formatUsd(subtotal)}</h2>
      <Link className="btn" href="/checkout">
        Proceed to Checkout
      </Link>
    </>
  );
}
