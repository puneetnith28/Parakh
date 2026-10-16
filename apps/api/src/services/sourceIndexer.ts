import { Requirement, SourceLocation } from "@parakh/contracts";

export class SourceIndexer {
  /**
   * Matches extracted requirements against the original source text to populate
   * exact character start/end offsets and bounded source snippets for traceability.
   */
  public static indexRequirements(
    sourceText: string,
    requirements: Requirement[],
    defaultPage = 1
  ): Requirement[] {
    const normalizedSource = sourceText.toLowerCase();

    return requirements.map((req) => {
      let loc: SourceLocation = req.sourceLocation || {
        pageNumber: defaultPage,
      };

      // Find best matching substring
      const keywords = this.extractSearchKeywords(req.text);
      const matchRange = this.findBestSubstringRange(normalizedSource, keywords);

      if (matchRange) {
        const charStart = matchRange.start;
        const charEnd = matchRange.end;
        // Bounded snippet with context
        const snippetStart = Math.max(0, charStart - 30);
        const snippetEnd = Math.min(sourceText.length, charEnd + 30);
        const sourceSnippet = sourceText.slice(snippetStart, snippetEnd).trim();

        loc = {
          pageNumber: loc.pageNumber || defaultPage,
          charStart,
          charEnd,
          snippetOffset: charStart,
          sourceSnippet,
        };
      }

      return {
        ...req,
        sourceLocation: loc,
      };
    });
  }

  private static extractSearchKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);
  }

  private static findBestSubstringRange(
    source: string,
    keywords: string[]
  ): { start: number; end: number } | null {
    if (keywords.length === 0) return null;

    let bestStart = -1;
    let bestEnd = -1;
    let maxFound = 0;

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      let pos = source.indexOf(kw);
      while (pos !== -1) {
        let found = 1;
        let lastPos = pos + kw.length;

        // Check proximity of other keywords within 200 chars
        const searchWindow = source.slice(pos, pos + 250);
        for (let j = 0; j < keywords.length; j++) {
          if (i !== j && searchWindow.includes(keywords[j])) {
            found++;
            const kwIdx = pos + searchWindow.indexOf(keywords[j]) + keywords[j].length;
            if (kwIdx > lastPos) lastPos = kwIdx;
          }
        }

        if (found > maxFound) {
          maxFound = found;
          bestStart = pos;
          bestEnd = lastPos;
        }

        pos = source.indexOf(kw, pos + 1);
      }
    }

    if (bestStart !== -1 && maxFound > 0) {
      return { start: bestStart, end: bestEnd };
    }

    return null;
  }
}
