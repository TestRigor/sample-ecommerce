import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createProductAction } from "@/app/actions/admin";
import AdminNav from "../../AdminNav";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <AdminNav />
      <main>
        <h1>New Product</h1>
        <ProductForm action={createProductAction} categories={categories} />
      </main>
    </>
  );
}
