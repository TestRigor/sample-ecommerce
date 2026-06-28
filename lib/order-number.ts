import { prisma } from "./db";

// ORD-YYYY-###### (6-digit zero-padded sequence within the app's lifetime).
export async function nextOrderNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const count = await prisma.order.count();
  const seq = String(count + 1).padStart(6, "0");
  return `ORD-${year}-${seq}`;
}
