export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// "49.99" | "49" | "$49.99" -> integer cents
export function dollarsToCents(input: string): number {
  const cleaned = String(input).replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned || "0");
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}
