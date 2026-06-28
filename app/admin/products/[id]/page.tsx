import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProductAction } from "@/app/actions/admin";
import AdminNav from "../../AdminNav";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminNav />
      <main>
        <h1>Edit Product: {product.name}</h1>
        <ProductForm action={updateProductAction} categories={categories} product={product} />
      </main>
    </>
  );
}
