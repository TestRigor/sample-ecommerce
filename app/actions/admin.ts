"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dollarsToCents } from "@/lib/money";
import { sendMail } from "@/lib/mail";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProductAction(formData: FormData) {
  await requireAdmin();
  const get = (k: string) => String(formData.get(k) || "").trim();

  const name = get("name");
  let slug = get("slug") || slugify(name);
  const description = get("description");
  const priceCents = dollarsToCents(get("price"));
  const imageUrl = get("imageUrl") || "https://picsum.photos/seed/new-product/600/600";
  const stock = Math.max(0, parseInt(get("stock") || "0", 10) || 0);
  const categoryId = get("categoryId");
  const active = formData.get("active") != null;

  if (!name || !categoryId) {
    redirect("/admin/products/new?error=missing");
  }

  // Ensure unique slug.
  let unique = slug;
  let n = 1;
  while (await prisma.product.findUnique({ where: { slug: unique } })) {
    unique = `${slug}-${n++}`;
  }

  await prisma.product.create({
    data: {
      name,
      slug: unique,
      description: description || name,
      priceCents,
      imageUrl,
      stock,
      active,
      categoryId,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const get = (k: string) => String(formData.get(k) || "").trim();
  const id = get("id");
  const name = get("name");
  const description = get("description");
  const priceCents = dollarsToCents(get("price"));
  const imageUrl = get("imageUrl");
  const stock = Math.max(0, parseInt(get("stock") || "0", 10) || 0);
  const categoryId = get("categoryId");
  const active = formData.get("active") != null;

  await prisma.product.update({
    where: { id },
    data: { name, description, priceCents, imageUrl, stock, categoryId, active },
  });

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function updateOrderAction(formData: FormData) {
  await requireAdmin();
  const get = (k: string) => String(formData.get(k) || "").trim();
  const id = get("id");
  const carrier = get("carrier");
  const trackingNumber = get("trackingNumber");
  const status = get("status");

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) redirect("/admin/orders");

  // Moving to SHIPPED requires tracking + carrier (spec §6.4 / §8).
  if (status === "SHIPPED" && (!carrier || !trackingNumber)) {
    redirect(`/admin/orders/${id}?error=tracking`);
  }

  await prisma.order.update({
    where: { id },
    data: {
      carrier: carrier || order!.carrier,
      trackingNumber: trackingNumber || order!.trackingNumber,
      status: status || order!.status,
      events: {
        create: {
          type: "STATUS_CHANGE",
          message: `Status set to ${status}${trackingNumber ? ` (tracking ${trackingNumber} via ${carrier})` : ""}`,
        },
      },
    },
  });

  if (status === "SHIPPED") {
    await sendMail({
      to: order!.email,
      subject: `Your order ${order!.orderNumber} has shipped`,
      text: `Your order ${order!.orderNumber} has shipped via ${carrier}. Tracking number: ${trackingNumber}.`,
    });
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${id}`);
}
