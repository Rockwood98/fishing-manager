import Fuse from "fuse.js";

export type SuggestionCandidate = {
  id: string;
  name: string;
  category: string;
  icon?: string | null;
  usedCount: number;
  lastUsedAt?: Date | null;
};

function recencyScore(lastUsedAt?: Date | null) {
  if (!lastUsedAt) return 0;
  const days = (Date.now() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - days / 60);
}

function textBoost(query: string, name: string, category: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  if (n === q) return 1;
  if (n.startsWith(q)) return 0.85;
  if (n.includes(q)) return 0.65;
  if (c.startsWith(q) || c.includes(q)) return 0.45;
  return 0;
}

export function rankSuggestions(
  query: string,
  candidates: SuggestionCandidate[],
): SuggestionCandidate[] {
  if (!candidates.length) return [];
  const hasQuery = query.trim().length > 0;
  const maxUsed = Math.max(...candidates.map((c) => c.usedCount), 1);
  const fuse = new Fuse(candidates, {
    threshold: 0.5,
    keys: ["name", "category"],
    includeScore: true,
  });
  const fuzzy =
    hasQuery
      ? fuse.search(query).map((r) => ({ id: r.item.id, score: 1 - (r.score ?? 1) }))
      : candidates.map((c) => ({ id: c.id, score: 0.5 }));
  const fuzzyMap = new Map(fuzzy.map((x) => [x.id, x.score]));

  return [...candidates]
    .map((candidate) => {
      const freq = candidate.usedCount / maxUsed;
      const recent = recencyScore(candidate.lastUsedAt);
      const fuzzyText = fuzzyMap.get(candidate.id) ?? (hasQuery ? 0.15 : 0.5);
      const directText = textBoost(query, candidate.name, candidate.category);
      const text = Math.max(fuzzyText, directText);
      const score = 0.5 * text + 0.3 * freq + 0.2 * recent;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.candidate);
}
