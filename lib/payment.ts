// Mock payment provider (see spec §7). Swappable behind this single function.
export type ChargeInput = {
  amountCents: number;
  currency: string;
  orderNumber: string;
  card: { number: string; expiration: string; crc: string; name: string };
};

export type ChargeResult =
  | { ok: true; ref: string }
  | { ok: false; reason: string };

export function charge(input: ChargeInput): ChargeResult {
  const number = (input.card.number || "").replace(/\s+/g, "");
  if (!number || !input.card.expiration || !input.card.crc || !input.card.name) {
    return { ok: false, reason: "Missing card details" };
  }
  if (number === "4000000000000002") {
    return { ok: false, reason: "Card declined" };
  }
  // Mock approves the known test card (and, for the demo, any other non-decline card).
  return { ok: true, ref: `MOCK-${input.orderNumber}` };
}
