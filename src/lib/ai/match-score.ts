/**
 * Scores how well a catalog food name matches a model-provided search term.
 * Token-based so "white rice cooked" matches "Rice, white, long-grain, cooked".
 */

const STOP = new Set(['a', 'an', 'the', 'of', 'with', 'and', 'in', 'raw', 'fresh', 'plain', 'de', 'du', 'la', 'le', 'et']);

export function normalizeTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

export function matchScore(term: string, candidate: { name: string; aliases?: string[] | null }): number {
  const termTokens = new Set(normalizeTokens(term));
  if (termTokens.size === 0) return 0;
  const names = [candidate.name, ...(candidate.aliases ?? [])];
  let best = 0;
  for (const n of names) {
    const cand = new Set(normalizeTokens(n));
    if (cand.size === 0) continue;
    let overlap = 0;
    for (const t of termTokens) if (cand.has(t)) overlap++;
    // Recall of the search term matters most; penalise very long catalog names lightly.
    const recall = overlap / termTokens.size;
    const precision = overlap / cand.size;
    const score = 0.75 * recall + 0.25 * precision;
    best = Math.max(best, score);
  }
  return Math.round(best * 100) / 100;
}

export const MATCH_THRESHOLD = 0.6;

export function bestMatch<T extends { name: string; aliases?: string[] | null }>(
  term: string,
  candidates: T[],
): { food: T; score: number } | null {
  let top: { food: T; score: number } | null = null;
  for (const c of candidates) {
    const score = matchScore(term, c);
    if (!top || score > top.score) top = { food: c, score };
  }
  return top && top.score >= MATCH_THRESHOLD ? top : null;
}
