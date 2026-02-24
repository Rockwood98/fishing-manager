"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";

const catchSchema = z.object({
  speciesName: z.string().min(2).max(80),
  lengthCm: z.coerce.number().min(1).max(300),
  weightKg: z.coerce.number().min(0).max(200).optional(),
  caughtAt: z.string().min(16),
  fisheryName: z.string().max(120).optional(),
  baitName: z.string().max(120).optional(),
  method: z.string().max(60).optional(),
  tripId: z.string().cuid().optional(),
  photoUrl: z.string().url().optional(),
});

function parseLocalDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Niepoprawna data i godzina rekordu");
  }
  return parsed;
}

export async function createCatchRecordAction(formData: FormData) {
  const ctx = await getAppContext();
  const parsed = catchSchema.safeParse({
    speciesName: formData.get("speciesName"),
    lengthCm: formData.get("lengthCm"),
    weightKg: formData.get("weightKg") || undefined,
    caughtAt: formData.get("caughtAt"),
    fisheryName: formData.get("fisheryName") || undefined,
    baitName: formData.get("baitName") || undefined,
    method: formData.get("method") || undefined,
    tripId: formData.get("tripId") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
  });
  if (!parsed.success) throw new Error("Niepoprawne dane rekordu");
  const caughtAt = parseLocalDateTime(parsed.data.caughtAt);

  const species = await prisma.species.upsert({
    where: { groupId_name: { groupId: ctx.group.id, name: parsed.data.speciesName } },
    update: {},
    create: { groupId: ctx.group.id, name: parsed.data.speciesName },
  });
  const bait = parsed.data.baitName
    ? await prisma.bait.upsert({
        where: { groupId_name: { groupId: ctx.group.id, name: parsed.data.baitName } },
        update: {},
        create: { groupId: ctx.group.id, name: parsed.data.baitName },
      })
    : null;

  await prisma.catchRecord.create({
    data: {
      groupId: ctx.group.id,
      tripId: parsed.data.tripId || null,
      speciesId: species.id,
      speciesName: parsed.data.speciesName,
      lengthCm: parsed.data.lengthCm,
      weightKg: parsed.data.weightKg || null,
      caughtAt,
      fisheryName: parsed.data.fisheryName || null,
      baitId: bait?.id || null,
      baitName: parsed.data.baitName || null,
      method: parsed.data.method || null,
      photoUrl: parsed.data.photoUrl || null,
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });
  revalidatePath("/app/records");
}
