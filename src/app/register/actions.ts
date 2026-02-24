"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type RegisterState = {
  error?: string;
  success?: string;
};

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.email().max(120),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasla sa rozne.",
  });

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Niepoprawne dane." };
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Konto z tym adresem email juz istnieje." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      timezone: "Europe/Warsaw",
    },
  });

  return { success: "Konto utworzone. Mozesz sie zalogowac." };
}
