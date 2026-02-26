import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFishingForecast } from "@/lib/fishing/forecast";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  const daysRaw = searchParams.get("days");
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  const days = daysRaw ? Number(daysRaw) : 5;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Niepoprawne wspolrzedne." }, { status: 400 });
  }

  try {
    const data = await getFishingForecast(lat, lon, days);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
