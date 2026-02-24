import bcrypt from "bcryptjs";
import { GroupRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("Qwerty123!@#", 12);
  const wojtek = await prisma.user.upsert({
    where: { email: "wojtekcharemski@gmail.com" },
    update: { name: "Wojtek", passwordHash },
    create: { email: "wojtekcharemski@gmail.com", name: "Wojtek", passwordHash },
  });

  const group = await prisma.group.upsert({
    where: { id: "demo-group" },
    update: { name: "WedkarzePL" },
    create: { id: "demo-group", name: "WedkarzePL" },
  });

  await prisma.membership.upsert({
    where: { groupId_userId: { groupId: group.id, userId: wojtek.id } },
    update: { role: GroupRole.OWNER },
    create: { groupId: group.id, userId: wojtek.id, role: GroupRole.OWNER },
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
