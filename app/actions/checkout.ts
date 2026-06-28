"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCartItems, clearCart } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth";
import { priceOrder } from "@/lib/pricing";
import { charge } from "@/lib/payment";
import { nextOrderNumber } from "@/lib/order-number";
import { sendMail } from "@/lib/mail";
import { formatUsd } from "@/lib/money";

export async function placeOrderAction(formData: FormData) {
  const get = (k: string) => String(formData.get(k) || "").trim();

  const email = get("email");
  const sameAsShipping = formData.get("sameAsShipping") != null;

  const shipping = {
    fullName: get("shipFullName"),
    line1: get("shipLine1"),
    line2: get("shipLine2"),
    city: get("shipCity"),
    state: get("shipState"),
    postalCode: get("shipPostal"),
    country: get("shipCountry"),
    phone: get("shipPhone"),
  };
  const billing = sameAsShipping
    ? shipping
    : {
        fullName: get("billFullName"),
        line1: get("billLine1"),
        line2: get("billLine2"),
        city: get("billCity"),
        state: get("billState"),
        postalCode: get("billPostal"),
        country: get("billCountry"),
        phone: get("billPhone"),
      };
  const card = {
    name: get("cardName"),
    number: get("cardNumber"),
    expiration: get("cardExpiration"),
    crc: get("cardCrc"),
  };

  // Required-field validation — re-show the form on failure (negative-test safe).
  const required = [
    email,
    shipping.fullName,
    shipping.line1,
    shipping.city,
    shipping.state,
    shipping.postalCode,
    shipping.country,
    card.name,
    card.number,
    card.expiration,
    card.crc,
  ];
  if (required.some((v) => !v)) {
    redirect("/checkout?error=missing");
  }

  const items = await getCartItems();
  if (items.length === 0) {
    redirect("/cart");
  }

  // Re-check stock and re-price from the DB (never trust client prices).
  for (const it of items) {
    if (!it.product.active || it.product.stock < it.quantity) {
      redirect("/cart?error=stock");
    }
  }
  const subtotalCents = items.reduce((s, it) => s + it.product.priceCents * it.quantity, 0);
  const totals = priceOrder(subtotalCents);

  const orderNumber = await nextOrderNumber();

  const payment = charge({
    amountCents: totals.totalCents,
    currency: "USD",
    orderNumber,
    card,
  });
  if (!payment.ok) {
    redirect(`/checkout?error=payment`);
  }

  const user = await getSessionUser();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: user?.id ?? null,
        email,
        status: "PAID",
        paymentStatus: "PAID",
        paymentRef: payment.ref,
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        shipping: JSON.stringify(shipping),
        billing: JSON.stringify(billing),
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            productName: it.product.name,
            priceCents: it.product.priceCents,
            quantity: it.quantity,
          })),
        },
        events: {
          create: [
            { type: "PAYMENT", message: `Payment captured (${payment.ref})` },
            { type: "STATUS_CHANGE", message: "Order placed and paid" },
          ],
        },
      },
    });

    for (const it of items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity } },
      });
    }
    return order;
  });

  await clearCart();

  // Best-effort emails.
  const itemLines = items
    .map((it) => `${it.quantity} x ${it.product.name} — ${formatUsd(it.product.priceCents)}`)
    .join("\n");
  await sendMail({
    to: email,
    subject: `Order ${orderNumber} confirmed`,
    text: `Thank you for your purchase!\n\nOrder ${orderNumber}\n${itemLines}\n\nTotal: ${formatUsd(
      totals.totalCents
    )}\nShipping to: ${shipping.fullName}, ${shipping.line1}, ${shipping.city}, ${shipping.state} ${shipping.postalCode}`,
  });
  await sendMail({
    to: process.env.OWNER_EMAIL || "owner@example.com",
    subject: `New order ${orderNumber}`,
    text: `New order ${orderNumber} from ${email}. Total ${formatUsd(totals.totalCents)}.\n${itemLines}`,
  });

  revalidatePath("/", "layout");
  redirect(`/checkout/confirmation/${orderNumber}`);
}
