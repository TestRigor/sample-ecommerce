import { redirect } from "next/navigation";
import { getCartItems } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth";
import { priceOrder } from "@/lib/pricing";
import { formatUsd } from "@/lib/money";
import { placeOrderAction } from "@/app/actions/checkout";

export const dynamic = "force-dynamic";

const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia"];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const items = await getCartItems();
  if (items.length === 0) redirect("/cart");

  const user = await getSessionUser();
  const subtotal = items.reduce((s, i) => s + i.product.priceCents * i.quantity, 0);
  const totals = priceOrder(subtotal);

  const errorMsg =
    searchParams.error === "missing"
      ? "Please fill in all required fields."
      : searchParams.error === "payment"
        ? "Payment was declined. Please check your card details."
        : null;

  return (
    <>
      <h1>Checkout</h1>
      {errorMsg ? (
        <p role="alert" style={{ color: "#b00020", fontWeight: 600 }}>
          {errorMsg}
        </p>
      ) : null}

      <form action={placeOrderAction}>
        <fieldset>
          <legend>Contact</legend>
          <label>
            Email address
            <input type="email" name="email" defaultValue={user?.email ?? ""} required />
          </label>
        </fieldset>

        <fieldset>
          <legend>Shipping</legend>
          <label>
            Full Name
            <input type="text" name="shipFullName" required />
          </label>
          <label>
            Address line 1
            <input type="text" name="shipLine1" required />
          </label>
          <label>
            Address line 2
            <input type="text" name="shipLine2" />
          </label>
          <label>
            City
            <input type="text" name="shipCity" required />
          </label>
          <label>
            State
            <input type="text" name="shipState" required />
          </label>
          <label>
            Postal code
            <input type="text" name="shipPostal" required />
          </label>
          <label>
            Country
            <select name="shipCountry" defaultValue="United States" required>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phone
            <input type="text" name="shipPhone" />
          </label>
          <div className="checkbox-row">
            <input type="checkbox" id="sameAsShipping" name="sameAsShipping" />
            <label htmlFor="sameAsShipping" style={{ margin: 0 }}>
              Same as shipping
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Payment</legend>
          <label>
            Full Name
            <input type="text" name="cardName" required />
          </label>
          <label>
            Credit Card
            <input type="text" name="cardNumber" required />
          </label>
          <label>
            Expiration
            <input type="text" name="cardExpiration" placeholder="MM/YY" required />
          </label>
          <label>
            CRC
            <input type="text" name="cardCrc" required />
          </label>
        </fieldset>

        <fieldset>
          <legend>Order summary</legend>
          <ul>
            {items.map((i) => (
              <li key={i.id}>
                {i.quantity} × {i.product.name} — {formatUsd(i.product.priceCents * i.quantity)}
              </li>
            ))}
          </ul>
          <p>Subtotal: {formatUsd(totals.subtotalCents)}</p>
          <p>Delivery: {formatUsd(totals.shippingCents)}</p>
          <p>Tax: {formatUsd(totals.taxCents)}</p>
          <p>
            <strong>Total: {formatUsd(totals.totalCents)}</strong>
          </p>
        </fieldset>

        <button type="submit">Place Order</button>
      </form>
    </>
  );
}
