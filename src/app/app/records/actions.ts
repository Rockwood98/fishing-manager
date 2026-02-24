"use server";

import { revalidatePath } from "next/cache";
import { GroupRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => {
      const text = value?.toString().trim() ?? "";
      return text === "" ? undefined : text;
    },
    z.string().max(max).optional(),
  );

const optionalCuid = z.preprocess(
  (value) => {
    const text = value?.toString().trim() ?? "";
    return text === "" ? undefined : text;
  },
  z.string().cuid().optional(),
);

const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      const text = value?.toString().trim() ?? "";
      if (text === "") return undefined;
      const parsed = Number(text);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    z.number().min(min).max(max).optional(),
  );

const catchSchema = z.object({
  speciesName: z.string().trim().min(2).max(80),
  lengthCm: z.coerce.number().min(1).max(300),
  weightKg: optionalNumber(0, 200),
  caughtAt: z.string().min(16),
  fisheryName: optionalText(120),
  baitName: optionalText(120),
  method: optionalText(60),
  tripId: optionalCuid,
  photoUrl: z.preprocess(
    (value) => {
      const text = value?.toString().trim() ?? "";
      return text === "" ? undefined : text;
    },
    z.string().url().optional(),
  ),
});

function parseLocalDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Niepoprawna data i godzina rekordu");
  }
  return parsed;
}

async function resolveSpeciesAndBait(
  groupId: string,
  speciesName: string,
  baitName?: string,
) {
  const species = await prisma.species.upsert({
    where: { groupId_name: { groupId, name: speciesName } },
    update: {},
    create: { groupId, name: speciesName },
  });

  const bait = baitName
    ? await prisma.bait.upsert({
        where: { groupId_name: { groupId, name: baitName } },
        update: {},
        create: { groupId, name: baitName },
      })
    : null;

  return { species, bait };
}

export async function createCatchRecordAction(formData: FormData) {
  const ctx = await getAppContext();
  const parsed = catchSchema.safeParse({
    speciesName: formData.get("speciesName"),
    lengthCm: formData.get("lengthCm"),
    weightKg: formData.get("weightKg"),
    caughtAt: formData.get("caughtAt"),
    fisheryName: formData.get("fisheryName"),
    baitName: formData.get("baitName"),
    method: formData.get("method"),
    tripId: formData.get("tripId"),
    photoUrl: formData.get("photoUrl"),
  });
  if (!parsed.success) throw new Error("Niepoprawne dane rekordu");

  const caughtAt = parseLocalDateTime(parsed.data.caughtAt);
  const { species, bait } = await resolveSpeciesAndBait(
    ctx.group.id,
    parsed.data.speciesName,
    parsed.data.baitName,
  );

  await prisma.catchRecord.create({
    data: {
      groupId: ctx.group.id,
      tripId: parsed.data.tripId ?? null,
      speciesId: species.id,
      speciesName: parsed.data.speciesName,
      lengthCm: parsed.data.lengthCm,
      weightKg: parsed.data.weightKg ?? null,
      caughtAt,
      fisheryName: parsed.data.fisheryName ?? null,
      baitId: bait?.id ?? null,
      baitName: parsed.data.baitName ?? null,
      method: parsed.data.method ?? null,
      photoUrl: parsed.data.photoUrl ?? null,
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });
  revalidatePath("/app/records");
}

export async function updateCatchRecordAction(formData: FormData) {
  const ctx = await getAppContext();
  const recordId = z.string().cuid().parse(formData.get("recordId"));
  const parsed = catchSchema.safeParse({
    speciesName: formData.get("speciesName"),
    lengthCm: formData.get("lengthCm"),
    weightKg: formData.get("weightKg"),
    caughtAt: formData.get("caughtAt"),
    fisheryName: formData.get("fisheryName"),
    baitName: formData.get("baitName"),
    method: formData.get("method"),
    tripId: formData.get("tripId"),
    photoUrl: formData.get("photoUrl"),
  });
  if (!parsed.success) throw new Error("Niepoprawne dane rekordu");

  const record = await prisma.catchRecord.findUnique({
    where: { id: recordId },
    select: { id: true, groupId: true },
  });
  if (!record || record.groupId !== ctx.group.id) {
    throw new Error("Nie znaleziono rekordu");
  }

  const caughtAt = parseLocalDateTime(parsed.data.caughtAt);
  const { species, bait } = await resolveSpeciesAndBait(
    ctx.group.id,
    parsed.data.speciesName,
    parsed.data.baitName,
  );

  await prisma.catchRecord.update({
    where: { id: recordId },
    data: {
      tripId: parsed.data.tripId ?? null,
      speciesId: species.id,
      speciesName: parsed.data.speciesName,
      lengthCm: parsed.data.lengthCm,
      weightKg: parsed.data.weightKg ?? null,
      caughtAt,
      fisheryName: parsed.data.fisheryName ?? null,
      baitId: bait?.id ?? null,
      baitName: parsed.data.baitName ?? null,
      method: parsed.data.method ?? null,
      photoUrl: parsed.data.photoUrl ?? null,
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/app/records");
}

export async function deleteCatchRecordAction(formData: FormData) {
  const ctx = await getAppContext(GroupRole.MEMBER);
  const recordId = z.string().cuid().parse(formData.get("recordId"));
  const record = await prisma.catchRecord.findUnique({
    where: { id: recordId },
    select: { id: true, groupId: true },
  });
  if (!record || record.groupId !== ctx.group.id) {
    throw new Error("Nie znaleziono rekordu");
  }

  await prisma.catchRecord.delete({ where: { id: recordId } });
  revalidatePath("/app/records");
}
