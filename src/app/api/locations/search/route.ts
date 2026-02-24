import { NextResponse } from "next/server";

type NominatimPlace = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ items: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "fishing-manager/1.0" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return NextResponse.json({ items: [] }, { status: 200 });

  const data = (await res.json()) as NominatimPlace[];
  return NextResponse.json({
    items: data.map((x) => ({
      id: x.place_id,
      label: x.display_name,
      lat: Number(x.lat),
      lon: Number(x.lon),
    })),
  });
}
