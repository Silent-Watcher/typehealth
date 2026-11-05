import ts from 'typescript'

import type { LoadedProject } from './project.ts'
import { normalizeFindings, type Finding } from './findings.ts'
import { scanSuppressions } from './suppressions.ts'
import { findBoundaryFindings } from './boundaries.ts'

export interface FileMetrics {
  file: string
  /** Share of eligible positions resolving to a non-`any` type, 0..1. null when no eligible positions. */
  typeCoverage: number | null
  eligiblePositions: number
  typedPositions: number
  explicitAny: number
  implicitAny: number
  unsafeAssertions: number
  nonNullAssertions: number
  suppressions: number
  /** Potentially unvalidated external data boundaries (heuristic, uncertain). */
  runtimeBoundaries: number
}

export interface ProjectMetrics {
  typeCoverage: number | null
  eligiblePositions: number
  typedPositions: number
  explicitAny: number
  implicitAny: number
  unsafeAssertions: number
  nonNullAssertions: number
  suppressions: number
  runtimeBoundaries: number
  files: number
  /** Number of well-known strictness compiler options not enabled. */
  weakStrictnessFlags: number
}

export interface AnalysisResult {
  files: FileMetrics[]
  project: ProjectMetrics
  findings: Finding[]
  durationMs: number
}

interface CoveragePosition {
  kind: 'value' | 'return'
  /** Node whose type decides coverage (declaration name or signature declaration). */
  node: ts.Node
  /** Explicit type annotation, if any; used to tell explicit from implicit any. */
  annotation: ts.Node | undefined
}

const STRICTNESS_FLAGS = [
  'strict',
  'noImplicitAny',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictBindCallApply',
  'strictPropertyInitialization',
  'noImplicitThis',
  'alwaysStrict',
  'useUnknownInCatchVariables',
] as const

const SUPPRESSION_SEVERITY = {
  'ts-ignore': 'medium',
  'ts-nocheck': 'high',
  'ts-expect-error': 'low',
} as const

export function analyzeProject(project: LoadedProject): AnalysisResult {
  const start = performance.now()
  const program = ts.createProgram(project.fileNames, project.compilerOptions)
  const checker = program.getTypeChecker()
  const findings: Finding[] = []
  const files: FileMetrics[] = []
  const analyzedFiles = new Set(project.fileNames)

  for (const sourceFile of program.getSourceFiles()) {
    if (!analyzedFiles.has(sourceFile.fileName)) continue
    files.push(analyzeFile(sourceFile, program, checker, findings))
  }
  files.sort((a, b) => a.file.localeCompare(b.file))

  const weak = disabledStrictnessFlags(project.compilerOptions)
  findings.push({
    file: project.configPath,
    line: 1,
    column: 1,
    rule: 'weak-strictness',
    severity: weak.length > 0 ? 'medium' : 'info',
    message:
      weak.length === 0
        ? 'All supported strictness compiler options are enabled.'
        : `Disabled strictness options: ${weak.join(', ')}.`,
  })

  const totals = files.reduce<ProjectMetrics>(
    (acc, f) => ({
      typeCoverage: null,
      eligiblePositions: acc.eligiblePositions + f.eligiblePositions,
      typedPositions: acc.typedPositions + f.typedPositions,
      explicitAny: acc.explicitAny + f.explicitAny,
      implicitAny: acc.implicitAny + f.implicitAny,
      unsafeAssertions: acc.unsafeAssertions + f.unsafeAssertions,
      nonNullAssertions: acc.nonNullAssertions + f.nonNullAssertions,
      suppressions: acc.suppressions + f.suppressions,
      runtimeBoundaries: acc.runtimeBoundaries + f.runtimeBoundaries,
      files: acc.files + 1,
      weakStrictnessFlags: weak.length,
    }),
    {
      typeCoverage: null,
      eligiblePositions: 0,
      typedPositions: 0,
      explicitAny: 0,
      implicitAny: 0,
      unsafeAssertions: 0,
      nonNullAssertions: 0,
      suppressions: 0,
      runtimeBoundaries: 0,
      files: 0,
      weakStrictnessFlags: weak.length,
    },
  )
  totals.typeCoverage =
    totals.eligiblePositions === 0
      ? null
      : totals.typedPositions / totals.eligiblePositions

  return { files, project: totals, findings: normalizeFindings(findings), durationMs: performance.now() - start }
}

function analyzeFile(
  sourceFile: ts.SourceFile,
  program: ts.Program,
  checker: ts.TypeChecker,
  findings: Finding[],
): FileMetrics {
  const metrics: FileMetrics = {
    file: sourceFile.fileName,
    typeCoverage: null,
    eligiblePositions: 0,
    typedPositions: 0,
    explicitAny: 0,
    implicitAny: 0,
    unsafeAssertions: 0,
    nonNullAssertions: 0,
    suppressions: 0,
    runtimeBoundaries: 0,
  }

  for (const diagnostic of program.getSyntacticDiagnostics(sourceFile)) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
    findings.push({
      file: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      rule: 'syntax-error',
      severity: 'high',
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    })
  }

  for (const suppression of scanSuppressions(sourceFile)) {
    metrics.suppressions++
    findings.push({
      file: sourceFile.fileName,
      line: suppression.line,
      column: suppression.character,
      rule: suppression.kind,
      severity: SUPPRESSION_SEVERITY[suppression.kind],
      message: `Type suppression comment: @${suppression.kind}.`,
    })
  }

  const boundaryFindings = findBoundaryFindings(sourceFile)
  metrics.runtimeBoundaries = boundaryFindings.length
  findings.push(...boundaryFindings)

  // Single AST walk. Coverage positions are collected here and classified
  // afterwards (needs the full set of `any` keywords to tell explicit from
  // implicit any), while finding-level rules are evaluated inline.
  const anyKeywords = new Set<ts.Node>()
  const positions: CoveragePosition[] = []

  const visit = (node: ts.Node): void => {
    switch (node.kind) {
      case ts.SyntaxKind.AnyKeyword: {
        anyKeywords.add(node)
        metrics.explicitAny++
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
        findings.push({
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
          rule: 'explicit-any',
          severity: 'medium',
          message: 'Explicit any type usage.',
        })
        return
      }
      case ts.SyntaxKind.VariableDeclaration: {
        const declaration = node as ts.VariableDeclaration
        positions.push({ kind: 'value', node: declaration.name, annotation: declaration.type })
        break
      }
      case ts.SyntaxKind.Parameter: {
        const parameter = node as ts.ParameterDeclaration
        positions.push({ kind: 'value', node: parameter.name, annotation: parameter.type })
        break
      }
      // Constructors and setters are excluded from return-type positions:
      // their return types are fixed (class instance / void) and say nothing about coverage.
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.GetAccessor:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction: {
        const signature = node as ts.SignatureDeclaration
        positions.push({ kind: 'return', node: signature, annotation: signature.type })
        break
      }
      case ts.SyntaxKind.AsExpression:
      case ts.SyntaxKind.TypeAssertionExpression: {
        const assertion = node as ts.AsExpression | ts.TypeAssertion
        reportAssertion(assertion, sourceFile, checker, metrics, findings)
        break
      }
      case ts.SyntaxKind.NonNullExpression: {
        metrics.nonNullAssertions++
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
        findings.push({
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
          rule: 'non-null-assertion',
          severity: 'low',
          message: 'Non-null assertion operator (!).',
        })
        break
      }
      default:
        break
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  metrics.eligiblePositions = positions.length
  for (const position of positions) {
    const type =
      position.kind === 'return'
        ? checker.getSignatureFromDeclaration(position.node as ts.SignatureDeclaration)?.getReturnType() ??
          checker.getTypeAtLocation(position.node)
        : checker.getTypeAtLocation(position.node)
    if ((type.flags & ts.TypeFlags.Any) === 0) {
      metrics.typedPositions++
      continue
    }
    if (position.annotation === undefined || !containsAnyKeyword(position.annotation, anyKeywords)) {
      metrics.implicitAny++
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(position.node.getStart())
      findings.push({
        file: sourceFile.fileName,
        line: line + 1,
        column: character + 1,
        rule: 'implicit-any',
        severity: 'medium',
        message: 'Type is implicitly any.',
      })
    }
  }
  metrics.typeCoverage =
    metrics.eligiblePositions === 0
      ? null
      : metrics.typedPositions / metrics.eligiblePositions

  return metrics
}

function reportAssertion(
  assertion: ts.AsExpression | ts.TypeAssertion,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  metrics: FileMetrics,
  findings: Finding[],
): void {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(assertion.getStart())
  const at = { file: sourceFile.fileName, line: line + 1, column: character + 1 }

  if (assertion.type.kind === ts.SyntaxKind.AnyKeyword) {
    metrics.unsafeAssertions++
    findings.push({ ...at, rule: 'unsafe-assertion', severity: 'high', message: 'Type assertion to any.' })
    return
  }
  if (
    assertion.expression.kind === ts.SyntaxKind.AsExpression ||
    assertion.expression.kind === ts.SyntaxKind.TypeAssertionExpression
  ) {
    metrics.unsafeAssertions++
    findings.push({ ...at, rule: 'unsafe-assertion', severity: 'medium', message: 'Double type assertion.' })
    return
  }
  const source = checker.getTypeAtLocation(assertion.expression)
  const target = checker.getTypeFromTypeNode(assertion.type)
  if (!checker.isTypeAssignableTo(source, target) && !checker.isTypeAssignableTo(target, source)) {
    metrics.unsafeAssertions++
    findings.push({
      ...at,
      rule: 'unsafe-assertion',
      severity: 'medium',
      message: 'Type assertion between unrelated types.',
    })
  }
}

function containsAnyKeyword(node: ts.Node, anyKeywords: Set<ts.Node>): boolean {
  if (anyKeywords.has(node)) return true
  return ts.forEachChild(node, (child) => containsAnyKeyword(child, anyKeywords)) === true
}

/** Compute which supported strictness options are effectively disabled.
 *  Enabling `strict` turns on the sub-flags unless they are explicitly false. */
export function disabledStrictnessFlags(options: ts.CompilerOptions): string[] {
  const strictOn = options.strict === true
  return STRICTNESS_FLAGS.filter((flag) => {
    if (flag === 'strict') return options.strict !== true
    const value = options[flag]
    return strictOn ? value === false : value !== true
  })
}
