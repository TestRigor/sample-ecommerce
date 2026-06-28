import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "owner@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "change-me-admin-password";

  // Idempotent admin owner
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: "Store Owner",
      role: "ADMIN",
    },
  });

  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Home & Kitchen", slug: "home-kitchen" },
    { name: "Books", slug: "books" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
  }
  const electronics = await prisma.category.findUniqueOrThrow({ where: { slug: "electronics" } });
  const home = await prisma.category.findUniqueOrThrow({ where: { slug: "home-kitchen" } });
  const books = await prisma.category.findUniqueOrThrow({ where: { slug: "books" } });

  const products = [
    {
      name: "Wireless Mouse",
      slug: "wireless-mouse",
      description: "A comfortable ergonomic wireless mouse with silent clicks and long battery life.",
      priceCents: 2499,
      imageUrl: "https://picsum.photos/seed/wireless-mouse/600/600",
      stock: 50,
      active: true,
      categoryId: electronics.id,
    },
    {
      name: "Mechanical Keyboard",
      slug: "mechanical-keyboard",
      description: "A tactile mechanical keyboard with hot-swappable switches and RGB backlight.",
      priceCents: 7999,
      imageUrl: "https://picsum.photos/seed/mechanical-keyboard/600/600",
      stock: 30,
      active: true,
      categoryId: electronics.id,
    },
    {
      name: "USB-C Hub",
      slug: "usb-c-hub",
      description: "A 7-in-1 USB-C hub with HDMI, card readers, and power delivery.",
      priceCents: 3999,
      imageUrl: "https://picsum.photos/seed/usb-c-hub/600/600",
      stock: 40,
      active: true,
      categoryId: electronics.id,
    },
    {
      name: "Ceramic Coffee Mug",
      slug: "ceramic-coffee-mug",
      description: "A 12oz ceramic mug that keeps your coffee warm and your desk tidy.",
      priceCents: 1499,
      imageUrl: "https://picsum.photos/seed/coffee-mug/600/600",
      stock: 100,
      active: true,
      categoryId: home.id,
    },
    {
      name: "Stainless Water Bottle",
      slug: "stainless-water-bottle",
      description: "An insulated stainless steel bottle that keeps drinks cold for 24 hours.",
      priceCents: 2999,
      imageUrl: "https://picsum.photos/seed/water-bottle/600/600",
      stock: 60,
      active: true,
      categoryId: home.id,
    },
    {
      name: "The Pragmatic Programmer",
      slug: "the-pragmatic-programmer",
      description: "A classic book on software craftsmanship and pragmatic engineering habits.",
      priceCents: 3599,
      imageUrl: "https://picsum.photos/seed/pragmatic/600/600",
      stock: 25,
      active: true,
      categoryId: books.id,
    },
    {
      name: "Clean Code",
      slug: "clean-code",
      description: "A handbook of agile software craftsmanship and writing maintainable code.",
      priceCents: 3299,
      imageUrl: "https://picsum.photos/seed/clean-code/600/600",
      stock: 0, // out of stock (QA)
      active: true,
      categoryId: books.id,
    },
    {
      name: "Discontinued Gadget",
      slug: "discontinued-gadget",
      description: "An old gadget that is no longer offered in the store.",
      priceCents: 999,
      imageUrl: "https://picsum.photos/seed/discontinued/600/600",
      stock: 5,
      active: false, // inactive (QA)
      categoryId: electronics.id,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
        stock: p.stock,
        active: p.active,
        categoryId: p.categoryId,
      },
      create: p,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
