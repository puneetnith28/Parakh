import { Requirement } from "@parakh/contracts";

export class RequirementDeduplicator {
  private static readonly SIMILARITY_THRESHOLD = 0.82;

  /**
   * Deduplicates extracted requirements conservatively.
   * Merges duplicates while preserving distinct acceptance criteria and prioritizing 'mandatory' status.
   */
  public static deduplicate(requirements: Requirement[]): Requirement[] {
    if (requirements.length <= 1) return requirements;

    const merged: Requirement[] = [];
    const visited = new Set<number>();

    for (let i = 0; i < requirements.length; i++) {
      if (visited.has(i)) continue;

      let current = { ...requirements[i] };
      visited.add(i);

      for (let j = i + 1; j < requirements.length; j++) {
        if (visited.has(j)) continue;

        const candidate = requirements[j];

        // Must be in the same category or one of them general to consider merging
        if (
          current.category !== candidate.category &&
          current.category !== "general" &&
          candidate.category !== "general"
        ) {
          continue;
        }

        const similarity = this.calculateJaccardSimilarity(current.text, candidate.text);

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          visited.add(j);

          // Merge priorities: mandatory takes precedence
          const priority =
            current.priority === "mandatory" || candidate.priority === "mandatory"
              ? "mandatory"
              : "preferred";

          // Merge category: specific category takes precedence over 'general'
          const category =
            current.category !== "general"
              ? current.category
              : candidate.category;

          // Merge acceptance criteria
          const combinedCriteria = new Set([
            ...(current.acceptanceCriteria || []),
            ...(candidate.acceptanceCriteria || []),
          ]);

          // Pick the longer, more descriptive text
          const text =
            current.text.length >= candidate.text.length
              ? current.text
              : candidate.text;

          current = {
            ...current,
            text,
            category,
            priority,
            acceptanceCriteria:
              combinedCriteria.size > 0 ? Array.from(combinedCriteria) : undefined,
          };
        }
      }

      merged.push(current);
    }

    return merged;
  }

  private static tokenize(text: string): Set<string> {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);
    return new Set(words);
  }

  private static calculateJaccardSimilarity(textA: string, textB: string): number {
    const setA = Array.from(this.tokenize(textA));
    const setB = Array.from(this.tokenize(textB));

    if (setA.length === 0 && setB.length === 0) return 1.0;
    if (setA.length === 0 || setB.length === 0) return 0.0;

    let matchCount = 0;
    for (const wordA of setA) {
      if (
        setB.some(
          (wordB) =>
            wordA === wordB ||
            (wordA.length > 5 && wordB.length > 5 && (wordA.startsWith(wordB.slice(0, 5)) || wordB.startsWith(wordA.slice(0, 5))))
        )
      ) {
        matchCount++;
      }
    }

    // Dice similarity coefficient
    return (2 * matchCount) / (setA.length + setB.length);
  }
}
