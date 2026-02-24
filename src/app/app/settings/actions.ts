"use server";

import { randomBytes } from "crypto";
import { GroupRole, InviteStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { PACKING_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";

const createGroupSchema = z.object({
  name: z.string().min(3).max(80),
});

export async function createGroupAction(formData: FormData) {
  const session = await getAppContext();
  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) throw new Error("Niepoprawna nazwa grupy");

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      memberships: {
        create: {
          userId: session.userId,
          role: GroupRole.OWNER,
        },
      },
    },
  });

  await prisma.species.createMany({
    data: [
      { groupId: group.id, name: "Karp" },
      { groupId: group.id, name: "Szczupak" },
      { groupId: group.id, name: "Sandacz" },
      { groupId: group.id, name: "Lin" },
    ],
  });

  await prisma.packingCatalogItem.createMany({
    data: PACKING_CATEGORIES.map((cat, i) => ({
      groupId: group.id,
      name: `${cat.icon} ${cat.name}`,
      category: cat.name,
      icon: cat.icon,
      sortOrder: i,
      createdById: session.userId,
      updatedById: session.userId,
    })),
  });

  revalidatePath("/app");
  revalidatePath("/app/settings");
}

export async function createInviteAction(formData: FormData) {
  const { group, membership, userId } = await getAppContext(GroupRole.ADMIN);
  if (membership.role === GroupRole.MEMBER) {
    throw new Error("Brak uprawnien");
  }
  const email = (formData.get("email")?.toString() || "").trim();
  const token = randomBytes(20).toString("hex");

  await prisma.$transaction([
    prisma.invite.updateMany({
      where: {
        groupId: group.id,
        status: InviteStatus.PENDING,
      },
      data: { status: InviteStatus.REVOKED },
    }),
    prisma.invite.create({
      data: {
        groupId: group.id,
        token,
        email: email || null,
        createdById: userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        role: GroupRole.MEMBER,
      },
    }),
  ]);

  revalidatePath("/app/settings");
}

export async function acceptInviteAction(token: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?invite=${encodeURIComponent(token)}`);
  }
  const userId = session.user.id;

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) {
    redirect(`/invite/${encodeURIComponent(token)}?status=not_found`);
  }
  if (invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
    redirect(`/invite/${encodeURIComponent(token)}?status=expired`);
  }

  try {
    await prisma.$transaction([
      prisma.membership.upsert({
        where: { groupId_userId: { groupId: invite.groupId, userId } },
        create: { groupId: invite.groupId, userId, role: invite.role },
        update: {},
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedById: userId },
      }),
    ]);
  } catch {
    redirect(`/invite/${encodeURIComponent(token)}?status=error`);
  }

  revalidatePath("/app");
  revalidatePath("/app/settings");
  redirect("/app");
}

export async function deleteInviteAction(formData: FormData) {
  const { group, membership } = await getAppContext(GroupRole.ADMIN);
  if (membership.role === GroupRole.MEMBER) {
    throw new Error("Brak uprawnien");
  }

  const inviteId = formData.get("inviteId")?.toString();
  if (!inviteId) throw new Error("Brak ID zaproszenia");

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.groupId !== group.id) {
    throw new Error("Nie znaleziono zaproszenia");
  }
  if (invite.status !== InviteStatus.PENDING) {
    throw new Error("Mozna usuwac tylko aktywne zaproszenia");
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: InviteStatus.REVOKED },
  });

  revalidatePath("/app/settings");
}
