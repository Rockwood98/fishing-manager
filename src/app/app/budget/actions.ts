"use server";

import { BudgetEntryType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { encodeBudgetMeta } from "@/lib/budget/splitwise";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";

function parseLocalDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Niepoprawna data");
  return parsed;
}

const splitExpenseSchema = z.object({
  category: z.string().min(2).max(60),
  amount: z.coerce.number().positive(),
  paidById: z.string().cuid(),
  participantIds: z.array(z.string().cuid()).min(1),
  tripId: z.string().cuid().optional(),
  entryDate: z.string().min(16),
  note: z.string().max(200).optional(),
});

const settlementSchema = z.object({
  fromUserId: z.string().cuid(),
  toUserId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  entryDate: z.string().min(16),
  note: z.string().max(200).optional(),
});

export async function createSplitExpenseAction(formData: FormData) {
  const ctx = await getAppContext();
  const parsed = splitExpenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    paidById: formData.get("paidById"),
    participantIds: formData.getAll("participantIds"),
    tripId: formData.get("tripId") || undefined,
    entryDate: formData.get("entryDate"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) throw new Error("Niepoprawne dane wydatku");

  await prisma.budgetEntry.create({
    data: {
      groupId: ctx.group.id,
      type: BudgetEntryType.EXPENSE,
      category: parsed.data.category,
      amount: parsed.data.amount,
      paidById: parsed.data.paidById,
      tripId: parsed.data.tripId || null,
      entryDate: parseLocalDateTime(parsed.data.entryDate),
      description: encodeBudgetMeta({
        kind: "expense",
        participantIds: parsed.data.participantIds,
        note: parsed.data.note,
      }),
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });
  revalidatePath("/app/budget");
}

export async function createSettlementAction(formData: FormData) {
  const ctx = await getAppContext();
  const parsed = settlementSchema.safeParse({
    fromUserId: formData.get("fromUserId"),
    toUserId: formData.get("toUserId"),
    amount: formData.get("amount"),
    entryDate: formData.get("entryDate"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) throw new Error("Niepoprawne dane splaty");
  if (parsed.data.fromUserId === parsed.data.toUserId) {
    throw new Error("Nadawca i odbiorca splaty nie moga byc ta sama osoba");
  }

  await prisma.budgetEntry.create({
    data: {
      groupId: ctx.group.id,
      type: BudgetEntryType.DEPOSIT,
      category: "Splata",
      amount: parsed.data.amount,
      paidById: parsed.data.fromUserId,
      tripId: null,
      entryDate: parseLocalDateTime(parsed.data.entryDate),
      description: encodeBudgetMeta({
        kind: "settlement",
        receiverId: parsed.data.toUserId,
        note: parsed.data.note,
      }),
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });
  revalidatePath("/app/budget");
}
