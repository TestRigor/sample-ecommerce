"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateCartId, getCartIdFromCookie } from "@/lib/cart";

export async function addToCartAction(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  const slug = String(formData.get("slug") || "");
  const qty = Math.max(1, Number(formData.get("quantity") || 1));

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active || product.stock < 1) {
    redirect(slug ? `/product/${slug}` : "/");
  }

  const cartId = await getOrCreateCartId();
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });
  const newQty = Math.min((existing?.quantity ?? 0) + qty, product!.stock);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    update: { quantity: newQty },
    create: { cartId, productId, quantity: Math.min(qty, product!.stock) },
  });

  revalidatePath("/", "layout");
  redirect(slug ? `/product/${slug}` : "/cart");
}

export async function updateCartItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") || "");
  const qty = Number(formData.get("quantity") || 1);
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { product: true } });
  if (item) {
    if (qty <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: Math.min(qty, item.product.stock) },
      });
    }
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const itemId = String(formData.get("itemId") || "");
  const cartId = getCartIdFromCookie();
  if (itemId && cartId) {
    await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  redirect("/cart");
}
