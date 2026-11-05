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
 */
export function scanSuppressions(sourceFile: ts.SourceFile): SuppressionMatch[] {
  const text = sourceFile.text
  const ranges: ts.CommentRange[] = []
  const seenStarts = new Set<number>()

  const collect = (node: ts.Node): void => {
    // Comments before the first token sit in the file's leading trivia; no
    // node's getFullStart() precedes them, so scan that region explicitly.
    // This is also where @ts-nocheck must live to be effective.
    if (ts.isSourceFile(node)) {
      push({ pos: 0, end: node.getStart() })
    }
    for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) push(range)
    for (const range of ts.getTrailingCommentRanges(text, node.end) ?? []) push(range)
  }

  const push = (range: { pos: number; end: number }): void => {
    if (seenStarts.has(range.pos)) return
    seenStarts.add(range.pos)
    ranges.push(range as ts.CommentRange)
  }

  const visit = (node: ts.Node): void => {
    collect(node)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  const matches: SuppressionMatch[] = []
  for (const range of ranges) {
    const comment = text.slice(range.pos, range.end)
    SUPPRESSION_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = SUPPRESSION_RE.exec(comment)) !== null) {
      const absolutePos = range.pos + match.index
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(absolutePos)
      matches.push({ kind: `ts-${match[1]}` as SuppressionKind, line: line + 1, character: character + 1 })
    }
  }
  return matches
}
