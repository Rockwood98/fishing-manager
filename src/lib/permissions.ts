import { GroupRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getMembership(userId: string, groupId: string) {
  return prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

export async function assertGroupMembership(userId: string, groupId: string) {
  const membership = await getMembership(userId, groupId);
  if (!membership) throw new Error("Brak dostępu do grupy");
  return membership;
}

export function assertMinRole(
  role: GroupRole,
  required: GroupRole = GroupRole.MEMBER,
) {
  const order: Record<GroupRole, number> = {
    OWNER: 3,
    ADMIN: 2,
    MEMBER: 1,
  };
  if (order[role] < order[required]) {
    throw new Error("Niewystarczające uprawnienia");
  }
}

export async function getPrimaryGroup(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { group: true },
    orderBy: { createdAt: "asc" },
  });
  return membership;
}
