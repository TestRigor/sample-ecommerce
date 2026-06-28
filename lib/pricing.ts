export function priceOrder(subtotalCents: number) {
  const flat = Number(process.env.SHIPPING_FLAT_CENTS || 500);
  const freeThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS || 5000);
  const taxRate = Number(process.env.TAX_RATE || 0.08);

  const shippingCents = subtotalCents >= freeThreshold ? 0 : flat;
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + shippingCents + taxCents;
  return { subtotalCents, shippingCents, taxCents, totalCents };
}
