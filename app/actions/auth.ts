"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "ADMIN" || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/admin/login?error=1");
  }
  setSessionCookie(user.id);
  redirect("/admin");
}

export async function customerLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/account/login?error=1");
  }
  setSessionCookie(user.id);
  redirect("/account");
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/account/register?error=missing");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/account/register?error=exists");
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: await bcrypt.hash(password, 10),
      role: "CUSTOMER",
    },
  });

  // Welcome email (spec §9).
  await sendMail({
    to: email,
    subject: "Welcome",
    text: `Welcome to our store${name ? `, ${name}` : ""}! Your account is ready.`,
  });

  setSessionCookie(user.id);
  redirect("/account");
}
