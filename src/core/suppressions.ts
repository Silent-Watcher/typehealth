import ts from 'typescript'

export type SuppressionKind = 'ts-ignore' | 'ts-nocheck' | 'ts-expect-error'

export interface SuppressionMatch {
  kind: SuppressionKind
  line: number
  character: number
}

const SUPPRESSION_RE = /@ts-(ignore|nocheck|expect-error)/g

/**
 * Find type suppression comments in a source file. Only text inside comments
 * is considered: comment ranges are collected from the leading/trailing trivia
 * of every node. Deliberate and compiler-checked `@ts-expect-error` is reported
 * too, since it still suppresses type information.
 *
 * Heuristic narrowing (matches TypeScript's own semantics): suppressions are
 * only honored in single-line comments, and `@ts-nocheck` only at the very
 * start of a file. Mentions inside block/doc comments are ignored.
 */
export function scanSuppressions(sourceFile: ts.SourceFile): SuppressionMatch[] {
  const text = sourceFile.text
  const ranges: ts.CommentRange[] = []
  const seenStarts = new Set<number>()

  const collect = (node: ts.Node): void => {
    // File-leading comments (incl. @ts-nocheck) are leading trivia of the
    // first node, whose getFullStart() is 0 — covered here without a
    // synthetic range so real CommentRange kinds are preserved.
    for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) {
      if (!seenStarts.has(range.pos)) {
        seenStarts.add(range.pos)
        ranges.push(range)
      }
    }
    for (const range of ts.getTrailingCommentRanges(text, node.end) ?? []) {
      if (!seenStarts.has(range.pos)) {
        seenStarts.add(range.pos)
        ranges.push(range)
      }
    }
  }

  const visit = (node: ts.Node): void => {
    collect(node)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  const matches: SuppressionMatch[] = []
  const fileCodeStart = sourceFile.getStart()
  for (const range of ranges) {
    // tsc honors suppressions only in single-line comments; block/doc
    // comment mentions are prose, not suppressions.
    if (range.kind !== ts.SyntaxKind.SingleLineCommentTrivia) continue
    const comment = text.slice(range.pos, range.end)
    // @ts-nocheck is only effective before the first code token.
    const isNoCheckRegion = range.pos < fileCodeStart
    SUPPRESSION_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = SUPPRESSION_RE.exec(comment)) !== null) {
      // @ts-nocheck only counts in the file-leading comment region.
      if (match[1] === 'nocheck' && !isNoCheckRegion) continue
      const absolutePos = range.pos + match.index
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(absolutePos)
      matches.push({ kind: `ts-${match[1]}` as SuppressionKind, line: line + 1, character: character + 1 })
    }
  }
  return matches
}
