"use server";

import { revalidatePath } from "next/cache";
import { GroupRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";
import { getTripWeather } from "@/lib/weather/service";

const tripSchema = z.object({
  title: z.string().min(3).max(80),
  startsAt: z.string().min(16),
  endsAt: z.string().min(16),
  locationName: z.string().min(2).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

function parseLocalDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Niepoprawny format daty");
  }
  return parsed;
}

export async function createTripAction(formData: FormData) {
  const ctx = await getAppContext();
  const parsed = tripSchema.safeParse({
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    locationName: formData.get("locationName"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });
  if (!parsed.success) throw new Error("Niepoprawne dane wyjazdu");

  const startsAt = parseLocalDateTime(parsed.data.startsAt);
  const endsAt = parseLocalDateTime(parsed.data.endsAt);
  if (endsAt <= startsAt) {
    throw new Error("Data zakonczenia musi byc pozniejsza niz start");
  }

  const location = await prisma.location.create({
    data: {
      groupId: ctx.group.id,
      name: parsed.data.locationName,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  const memberIds = await prisma.membership.findMany({
    where: { groupId: ctx.group.id },
    select: { userId: true },
  });

  const trip = await prisma.trip.create({
    data: {
      groupId: ctx.group.id,
      title: parsed.data.title,
      startsAt,
      endsAt,
      locationId: location.id,
      createdById: ctx.userId,
      updatedById: ctx.userId,
      participants: {
        createMany: {
          data: memberIds.map((member) => ({ userId: member.userId })),
          skipDuplicates: true,
        },
      },
    },
  });
  try {
    await getTripWeather(trip.id);
  } catch {
    // Pogoda nie blokuje tworzenia wyjazdu - user moze odswiezyc pozniej.
  }

  revalidatePath("/app/trips");
  revalidatePath("/app/packing");
}

export async function deleteTripAction(formData: FormData) {
  const ctx = await getAppContext(GroupRole.ADMIN);
  const tripId = z.string().cuid().parse(formData.get("tripId"));

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, groupId: true },
  });
  if (!trip || trip.groupId !== ctx.group.id) {
    throw new Error("Nie znaleziono wyjazdu");
  }

  await prisma.trip.delete({ where: { id: tripId } });
  revalidatePath("/app/trips");
  revalidatePath("/app/packing");
}

export async function removeTripParticipantAction(formData: FormData) {
  const ctx = await getAppContext(GroupRole.ADMIN);
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const userId = z.string().cuid().parse(formData.get("userId"));

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, groupId: true },
  });
  if (!trip || trip.groupId !== ctx.group.id) {
    throw new Error("Nie znaleziono wyjazdu");
  }

  const participantsCount = await prisma.tripParticipant.count({
    where: { tripId },
  });
  if (participantsCount <= 1) {
    throw new Error("Wyjazd musi miec przynajmniej jednego uczestnika");
  }

  await prisma.tripParticipant.deleteMany({
    where: { tripId, userId },
  });

  revalidatePath("/app/trips");
}

export async function addTripParticipantAction(formData: FormData) {
  const ctx = await getAppContext(GroupRole.ADMIN);
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const userId = z.string().cuid().parse(formData.get("userId"));

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, groupId: true },
  });
  if (!trip || trip.groupId !== ctx.group.id) {
    throw new Error("Nie znaleziono wyjazdu");
  }

  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId: ctx.group.id, userId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Uzytkownik nie nalezy do tej grupy");
  }

  await prisma.tripParticipant.upsert({
    where: { tripId_userId: { tripId, userId } },
    create: { tripId, userId },
    update: {},
  });

  revalidatePath("/app/trips");
}
