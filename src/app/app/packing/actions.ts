"use server";

import { GroupRole, PackingNeedType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCategoryIcon } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";

const TEMPLATE_PREFIX = "TEMPLATE::";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  needType: z.nativeEnum(PackingNeedType).default(PackingNeedType.TO_TAKE),
});

export async function addCatalogItemAction(formData: FormData) {
  const ctx = await getAppContext(GroupRole.ADMIN);
  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || "Inne",
    needType: formData.get("needType") || PackingNeedType.TO_TAKE,
  });
  if (!parsed.success) throw new Error("Niepoprawne dane");
  const count = await prisma.packingCatalogItem.count({
    where: { groupId: ctx.group.id },
  });
  await prisma.packingCatalogItem.create({
    data: {
      groupId: ctx.group.id,
      name: parsed.data.name,
      category: parsed.data.category,
      icon: getCategoryIcon(parsed.data.category),
      needType: parsed.data.needType,
      sortOrder: count,
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });
  revalidatePath("/app/packing");
}

export async function addTripItemAction(formData: FormData) {
  const ctx = await getAppContext();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const catalogIdFromForm = formData.get("catalogItemId")?.toString() || null;
  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || "Inne",
    needType: formData.get("needType") || PackingNeedType.TO_TAKE,
  });
  if (!parsed.success) throw new Error("Niepoprawne dane");
  const resolvedIcon = getCategoryIcon(parsed.data.category);

  let catalogId = catalogIdFromForm;
  if (!catalogId) {
    const existing = await prisma.packingCatalogItem.findFirst({
      where: {
        groupId: ctx.group.id,
        archived: false,
        name: {
          equals: parsed.data.name,
          mode: "insensitive",
        },
      },
    });
    if (existing) {
      catalogId = existing.id;
    } else {
      const count = await prisma.packingCatalogItem.count({
        where: { groupId: ctx.group.id },
      });
      const created = await prisma.packingCatalogItem.create({
        data: {
          groupId: ctx.group.id,
          name: parsed.data.name,
          category: parsed.data.category,
          icon: resolvedIcon,
          needType: parsed.data.needType,
          sortOrder: count,
          createdById: ctx.userId,
          updatedById: ctx.userId,
        },
      });
      catalogId = created.id;
    }
  }

  const order = await prisma.tripPackingItem.count({ where: { tripId } });
  await prisma.tripPackingItem.create({
    data: {
      tripId,
      catalogItemId: catalogId,
      name: parsed.data.name,
      category: parsed.data.category,
      icon: resolvedIcon,
      needType: parsed.data.needType,
      sortOrder: order,
      source: catalogId ? "catalog" : "adhoc",
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });
  await prisma.packingCatalogItem.update({
    where: { id: catalogId },
    data: {
      usedCount: { increment: 1 },
      lastUsedAt: new Date(),
      updatedById: ctx.userId,
    },
  });
  revalidatePath("/app/packing");
}

export async function toggleTripItemAction(formData: FormData) {
  const ctx = await getAppContext();
  const itemId = z.string().cuid().parse(formData.get("itemId"));
  const item = await prisma.tripPackingItem.findUnique({
    where: { id: itemId },
    include: { trip: true },
  });
  if (!item || item.trip.groupId !== ctx.group.id) throw new Error("Brak dostepu");
  await prisma.tripPackingItem.update({
    where: { id: itemId },
    data: { checked: !item.checked, updatedById: ctx.userId },
  });
  revalidatePath("/app/packing");
}

export async function removeTripItemAction(formData: FormData) {
  const ctx = await getAppContext();
  const itemId = z.string().cuid().parse(formData.get("itemId"));
  const item = await prisma.tripPackingItem.findUnique({
    where: { id: itemId },
    include: { trip: true },
  });
  if (!item || item.trip.groupId !== ctx.group.id) throw new Error("Brak dostepu");
  await prisma.tripPackingItem.delete({ where: { id: itemId } });
  revalidatePath("/app/packing");
}

export async function removeCatalogItemAction(formData: FormData) {
  const ctx = await getAppContext(GroupRole.ADMIN);
  const itemId = z.string().cuid().parse(formData.get("itemId"));
  const item = await prisma.packingCatalogItem.findUnique({ where: { id: itemId } });
  if (!item || item.groupId !== ctx.group.id) throw new Error("Brak dostepu");
  await prisma.packingCatalogItem.update({
    where: { id: itemId },
    data: { archived: true, updatedById: ctx.userId },
  });
  revalidatePath("/app/packing");
}

export async function applyTemplateAction(formData: FormData) {
  const ctx = await getAppContext();
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const templateName = z.string().trim().min(2).max(60).parse(formData.get("templateName"));
  const templateItems = await prisma.packingCatalogItem.findMany({
    where: {
      groupId: ctx.group.id,
      archived: true,
      category: {
        startsWith: `${TEMPLATE_PREFIX}${templateName}::`,
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  if (!templateItems.length) throw new Error("Brak szablonu");
  const count = await prisma.tripPackingItem.count({ where: { tripId } });
  await prisma.tripPackingItem.createMany({
    data: templateItems.map((item, i) => ({
      tripId,
      catalogItemId: null,
      name: item.name,
      category: item.category.replace(`${TEMPLATE_PREFIX}${templateName}::`, ""),
      icon: item.icon || getCategoryIcon("Inne"),
      needType: item.needType,
      sortOrder: count + i,
      source: "template",
      createdById: ctx.userId,
      updatedById: ctx.userId,
    })),
  });
  revalidatePath("/app/packing");
}

export async function saveTemplateFromTripAction(formData: FormData) {
  const ctx = await getAppContext(GroupRole.ADMIN);
  const tripId = z.string().cuid().parse(formData.get("tripId"));
  const templateName = z.string().trim().min(2).max(60).parse(formData.get("templateName"));

  const tripItems = await prisma.tripPackingItem.findMany({
    where: { tripId },
    orderBy: { sortOrder: "asc" },
  });
  if (!tripItems.length) throw new Error("Lista wyjazdu jest pusta");

  await prisma.$transaction([
    prisma.packingCatalogItem.deleteMany({
      where: {
        groupId: ctx.group.id,
        archived: true,
        category: { startsWith: `${TEMPLATE_PREFIX}${templateName}::` },
      },
    }),
    prisma.packingCatalogItem.createMany({
      data: tripItems.map((item, i) => ({
        groupId: ctx.group.id,
        name: item.name,
        category: `${TEMPLATE_PREFIX}${templateName}::${item.category}`,
        icon: item.icon || null,
        needType: item.needType,
        sortOrder: i,
        usedCount: 0,
        archived: true,
        createdById: ctx.userId,
        updatedById: ctx.userId,
      })),
    }),
  ]);
  revalidatePath("/app/packing");
}
