import "server-only";
import { cookies } from "next/headers";

const DISCOUNT_COOKIE = "discountCode";

// Discount codes and the percentage each takes off the cart subtotal.
const DISCOUNT_CODES: Record<string, number> = {
  SAVE10: 10,
  WELCOME15: 15,
};

export type Discount = { code: string; percent: number };

export function findDiscount(code: string): Discount | null {
  const trimmed = code.trim();
  const percent = DISCOUNT_CODES[trimmed];
  return percent ? { code: trimmed, percent } : null;
}

export function discountCents(subtotalCents: number, percent: number): number {
  return Math.round((subtotalCents * percent) / 100);
}

/** Read-only: the discount applied to the current cart, or null. */
export function getAppliedDiscount(): Discount | null {
  const code = cookies().get(DISCOUNT_COOKIE)?.value;
  return code ? findDiscount(code) : null;
}

/** Mutating: remembers the applied discount code. Server Action / Route only. */
export function setAppliedDiscount(code: string) {
  cookies().set(DISCOUNT_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
