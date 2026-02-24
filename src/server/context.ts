import { GroupRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { assertMinRole, getPrimaryGroup } from "@/lib/permissions";

export async function getAppContext(requiredRole: GroupRole = GroupRole.MEMBER) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const membership = await getPrimaryGroup(session.user.id);
  if (!membership) redirect("/app/settings");
  assertMinRole(membership.role, requiredRole);
  return {
    userId: session.user.id,
    group: membership.group,
    membership,
  };
}
