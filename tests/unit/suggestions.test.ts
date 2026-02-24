import { describe, expect, it } from "vitest";
import { rankSuggestions, type SuggestionCandidate } from "@/lib/suggestions";

const now = new Date();

const candidates: SuggestionCandidate[] = [
  {
    id: "a",
    name: "Wędka karpiowa",
    category: "Sprzęt",
    usedCount: 20,
    lastUsedAt: now,
  },
  {
    id: "b",
    name: "Kukurydza",
    category: "Przynęty",
    usedCount: 8,
    lastUsedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
  },
  {
    id: "c",
    name: "Krzesło",
    category: "Nocleg",
    usedCount: 2,
    lastUsedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
  },
];

describe("rankSuggestions", () => {
  it("promuje dopasowanie tekstowe i popularność", () => {
    const ranked = rankSuggestions("wedka", candidates);
    expect(ranked[0].id).toBe("a");
  });

  it("uwzględnia świeżość", () => {
    const ranked = rankSuggestions("krzeslo", candidates);
    expect(ranked[0].id).toBe("c");
  });
});
