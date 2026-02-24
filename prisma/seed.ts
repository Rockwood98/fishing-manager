import bcrypt from "bcryptjs";
import { GroupRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("test12345", 12);
  const [adam, bartek] = await Promise.all([
    prisma.user.upsert({
      where: { email: "adam@wedka.pl" },
      update: { passwordHash },
      create: { email: "adam@wedka.pl", name: "Adam", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "bartek@wedka.pl" },
      update: { passwordHash },
      create: { email: "bartek@wedka.pl", name: "Bartek", passwordHash },
    }),
  ]);

  const group = await prisma.group.upsert({
    where: { id: "demo-group" },
    update: { name: "Ekipa na zasiadki" },
    create: { id: "demo-group", name: "Ekipa na zasiadki" },
  });

  await prisma.membership.upsert({
    where: { groupId_userId: { groupId: group.id, userId: adam.id } },
    update: { role: GroupRole.OWNER },
    create: { groupId: group.id, userId: adam.id, role: GroupRole.OWNER },
  });

  await prisma.membership.upsert({
    where: { groupId_userId: { groupId: group.id, userId: bartek.id } },
    update: { role: GroupRole.ADMIN },
    create: { groupId: group.id, userId: bartek.id, role: GroupRole.ADMIN },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
