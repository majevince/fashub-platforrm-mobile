// Mirrors web's lib/text/hashtags.ts exactly (same regex, same dedupe/
// lowercase behavior) — can't import it directly since fashub (web) and
// fashub-platform (this monorepo) are separate repos, but a project tagged
// via #streetwear needs to produce the identical tag string on both
// platforms for search/filtering to treat it consistently.
export const HASHTAG_RE = /#(\w+)/g;

export function parseHashtags(text: string): string[] {
  const matches = text.match(HASHTAG_RE) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

export interface TextSegment {
  type: 'text' | 'hashtag';
  value: string;
}

export function splitHashtagSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(HASHTAG_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'hashtag', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}
