import { NextResponse } from "next/server";

type NominatimPlace = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
  };
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const BASE_LIMIT = "6";
const EUROPE_VIEWBOX = "-25,72,45,34"; // minLon,maxLat,maxLon,minLat

async function searchNominatim(
  query: string,
  options: { countryCodes?: string; europeOnly?: boolean } = {},
) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", BASE_LIMIT);
  url.searchParams.set("addressdetails", "1");

  if (options.countryCodes) {
    url.searchParams.set("countrycodes", options.countryCodes);
  }
  if (options.europeOnly) {
    url.searchParams.set("viewbox", EUROPE_VIEWBOX);
    url.searchParams.set("bounded", "1");
  }

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "fishing-manager/1.0" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return (await res.json()) as NominatimPlace[];
}

function formatPlaceLabel(place: NominatimPlace) {
  const address = place.address ?? {};
  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    address.municipality ??
    place.display_name.split(",")[0]?.trim() ??
    "Miejsce";
  const normalizedState = address.state
    ? address.state
        .replace(/^woj(?:e|ó)?w(?:ó|o)dztwo\s+/i, "")
        .replace(/^woj\.\s*/i, "")
        .trim()
    : null;
  const state = normalizedState ? `woj. ${normalizedState}` : null;
  const road = address.road;
  const house = address.house_number;
  const postcode = address.postcode;

  if (road) {
    const streetPart = house ? `ul. ${road} ${house}` : `ul. ${road}`;
    const postPart = postcode ? `${postcode} ` : "";
    return `${locality}, ${streetPart}, ${postPart}${state ?? ""}`.trim().replace(/\s+,/g, ",");
  }

  if (state) {
    return `${locality}, ${state}`;
  }

  return locality;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ items: [] });

  // Najpierw zawężamy podpowiedzi do Polski, a dopiero przy braku wyników
  // robimy fallback do Europy, aby nie pokazywać losowych miejsc z innych kontynentów.
  let data = await searchNominatim(query, { countryCodes: "pl" });
  if (data.length === 0) {
    data = await searchNominatim(query, { europeOnly: true });
  }

  return NextResponse.json({
    items: data.map((x) => ({
      id: x.place_id,
      label: formatPlaceLabel(x),
      fullLabel: x.display_name,
      lat: Number(x.lat),
      lon: Number(x.lon),
    })),
  });
}
