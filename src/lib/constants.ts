export const PACKING_CATEGORIES = [
  { name: "Jedzenie", icon: "🥕" },
  { name: "Sprzet", icon: "🎣" },
  { name: "Nocleg", icon: "⛺" },
  { name: "Elektronika", icon: "🔋" },
  { name: "Ubrania", icon: "🧥" },
  { name: "Przynety", icon: "🪱" },
  { name: "Inne", icon: "📦" },
] as const;

export function getCategoryIcon(category: string) {
  const found = PACKING_CATEGORIES.find(
    (c) => c.name.toLowerCase() === category.toLowerCase(),
  );
  return found?.icon ?? "📦";
}

export const PACKING_TEMPLATES = [
  {
    name: "Zasiadka 24h",
    items: ["Wedki", "Podbierak", "Namiot", "Latarka czolowa", "Termos"],
  },
  {
    name: "Weekend 48h",
    items: ["Wedki", "Krzeslo", "Lozko karpiowe", "Kuchenka", "Powerbank"],
  },
  {
    name: "Zima",
    items: ["Kurtka zimowa", "Rekawice", "Grzalki", "Termos", "Namiot"],
  },
  {
    name: "Zasiadka z lodka",
    items: ["Lodka", "Kamizelka", "Echosonda", "Wiosla", "Akumulator"],
  },
] as const;
