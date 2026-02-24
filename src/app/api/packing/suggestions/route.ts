import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrimaryGroup } from "@/lib/permissions";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });
  const group = await getPrimaryGroup(session.user.id);
  if (!group) return NextResponse.json({ items: [] });
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (!query) return NextResponse.json({ items: [] });
  const normalizedQuery = normalizeText(query);

  const candidates = await prisma.packingCatalogItem.findMany({
    where: { groupId: group.groupId, archived: false },
    orderBy: [{ name: "asc" }],
    take: 500,
  });

  const dedupe = new Set<string>();
  const filtered = candidates
    .filter((item) => normalizeText(item.name).startsWith(normalizedQuery))
    .filter((item) => {
      const key = normalizeText(item.name);
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    })
    .slice(0, 12);

  return NextResponse.json({ items: filtered });
}
