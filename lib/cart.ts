import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";

const CART_COOKIE = "cartId";

/** Read-only: returns the current cart id from the cookie, or null. */
export function getCartIdFromCookie(): string | null {
  return cookies().get(CART_COOKIE)?.value ?? null;
}

/** Mutating: ensures a cart row exists and the cookie is set. Server Action / Route only. */
export async function getOrCreateCartId(): Promise<string> {
  const existing = getCartIdFromCookie();
  if (existing) {
    const cart = await prisma.cart.findUnique({ where: { id: existing } });
    if (cart) return existing;
  }
  const cart = await prisma.cart.create({ data: {} });
  cookies().set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart.id;
}

export async function getCartItems() {
  const cartId = getCartIdFromCookie();
  if (!cartId) return [];
  return prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true },
    orderBy: { id: "asc" },
  });
}

export async function getCartCount(): Promise<number> {
  const items = await getCartItems();
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export async function clearCart() {
  const cartId = getCartIdFromCookie();
  if (!cartId) return;
  await prisma.cartItem.deleteMany({ where: { cartId } });
}
