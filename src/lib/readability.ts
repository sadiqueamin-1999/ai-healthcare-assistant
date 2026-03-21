/**
 * Compute the Flesch-Kincaid Grade Level for a block of text.
 * Returns a numeric grade level (e.g. 8.2 ≈ US 8th grade).
 */
export function fleschKincaidGrade(text: string): number {
  const sentences = text
    .replace(/[.!?]+/g, ".|")
    .split("|")
    .filter((s) => s.trim().length > 0);

  const words = text
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0 || sentences.length === 0) return 0;

  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const grade =
    0.39 * (words.length / sentences.length) +
    11.8 * (syllableCount / words.length) -
    15.59;

  return Math.max(0, Math.round(grade * 10) / 10);
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  const matches = w.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Return a human-friendly label for a grade level.
 */
export function gradeLabel(grade: number): string {
  if (grade <= 6) return "Simple (primary school)";
  if (grade <= 8) return "Moderate (secondary school)";
  if (grade <= 12) return "Advanced (GCSE / A-level)";
  if (grade <= 16) return "Complex (university level)";
  return "Very complex (postgraduate)";
}
