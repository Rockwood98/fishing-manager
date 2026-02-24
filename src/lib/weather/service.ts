import { prisma } from "@/lib/prisma";
import { fetchOpenMeteoWeather } from "@/lib/weather/openMeteo";

export async function getTripWeather(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { location: true },
  });
  if (!trip || !trip.location) {
    throw new Error("Brak wyjazdu lub lokalizacji");
  }
  const snapshot = await fetchOpenMeteoWeather(
    trip.location.latitude,
    trip.location.longitude,
    trip.startsAt,
    trip.endsAt,
  );
  await prisma.trip.update({
    where: { id: tripId },
    data: { weatherCache: snapshot },
  });
  return snapshot;
}
