import ts from 'typescript'

import type { Finding } from './findings.ts'

type BoundaryKind = 'json-parse' | 'http-request' | 'http-response' | 'queue-payload'

const MESSAGES: Record<BoundaryKind, string> = {
  'json-parse': 'JSON.parse result used without recognized runtime validation (uncertain).',
  'http-request': 'External request data accessed without recognized runtime validation (uncertain).',
  'http-response': 'External HTTP response used without recognized runtime validation (uncertain).',
  'queue-payload': 'Queue message payload used without recognized runtime validation (uncertain).',
}

/** Method names treated as runtime validation (zod, valibot, yup, joi, ajv,
 *  class-validator, io-ts, effect/schema). Static name-based heuristic. */
const VALIDATOR_METHODS = new Set([
  'parse',
  'safeParse',
  'validate',
  'validateSync',
  'validateOrReject',
  'decode',
  'decodeUnknownSync',
  'isValid',
  'assert',
])

/** Objects whose methods collide with validator names but validate nothing. */
const NON_VALIDATOR_OBJECTS = new Set(['JSON', 'Date', 'Number', 'URL', 'path'])

/** Parameter names treated as HTTP request objects (express, fastify, koa). */
const REQUEST_PARAM_NAMES = new Set(['req', 'request', 'ctx'])

const REQUEST_DATA_PROPERTIES = new Set(['body', 'query', 'params'])

interface BoundarySite {
  node: ts.Node
  kind: BoundaryKind
  /** Variable the boundary value is assigned to, for file-scoped validation lookup. */
  assignedName?: string
  /** Grouping key; only the first site per group is reported to avoid flooding. */
  group?: string
}

/**
 * Limited static detection of potentially unvalidated external data
 * boundaries. Name- and pattern-based heuristics, NOT a taint analysis:
 * findings are labeled uncertain and cannot prove runtime (in)safety.
 * A boundary is considered validated when it flows (directly, or via a
 * same-file variable assignment) into a recognized validation call.
 */
export function findBoundaryFindings(sourceFile: ts.SourceFile): Finding[] {
  const sites: BoundarySite[] = []
  /** Nodes passed directly as arguments to a recognized validator call. */
  const directlyValidated = new Set<ts.Node>()
  /** Variable names passed to a recognized validator call in this file. */
  const validatedNames = new Set<string>()
  const seenGroups = new Set<string>()

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      collectCallSites(node, sites, directlyValidated, validatedNames)
    } else if (ts.isNewExpression(node)) {
      // bullmq: new Worker(queue, async (job) => job.data)
      if (calleeName(node.expression) === 'Worker') {
        for (const arg of node.arguments ?? []) markQueueParams(arg, sites)
      }
    } else if (ts.isPropertyAccessExpression(node)) {
      // express/koa: req.body, req.query, req.params, ctx.request.body
      const prop = node.name.text
      const root = rootIdentifierText(node)
      if (prop !== undefined && root !== undefined && REQUEST_PARAM_NAMES.has(root) && REQUEST_DATA_PROPERTIES.has(prop)) {
        sites.push({
          node,
          kind: 'http-request',
          assignedName: assignedNameOf(node),
          group: `${root}.${prop}`,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  const findings: Finding[] = []
  for (const site of sites) {
    if (directlyValidated.has(site.node)) continue
    if (site.assignedName !== undefined && validatedNames.has(site.assignedName)) continue
    if (site.group !== undefined) {
      if (seenGroups.has(site.group)) continue
      seenGroups.add(site.group)
    }
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(site.node.getStart())
    findings.push({
      file: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      rule: 'unvalidated-boundary',
      severity: 'medium',
      message: MESSAGES[site.kind],
    })
  }
  return findings
}

function collectCallSites(
  call: ts.CallExpression,
  sites: BoundarySite[],
  directlyValidated: Set<ts.Node>,
  validatedNames: Set<string>,
): void {
  const callee = call.expression

  // Validator call: mark its arguments as validated (directly or by name).
  if (
    ts.isPropertyAccessExpression(callee) &&
    VALIDATOR_METHODS.has(callee.name.text) &&
    !NON_VALIDATOR_OBJECTS.has(rootIdentifierText(callee) ?? '')
  ) {
    for (const arg of call.arguments) directlyValidated.add(arg)
    for (const arg of call.arguments) {
      if (ts.isIdentifier(arg)) validatedNames.add(arg.text)
    }
  }

  // JSON.parse: the result is any and carries no runtime guarantees.
  if (
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === 'parse' &&
    callee.expression.kind === ts.SyntaxKind.Identifier &&
    (callee.expression as ts.Identifier).text === 'JSON'
  ) {
    sites.push({ node: call, kind: 'json-parse', assignedName: assignedNameOf(call) })
  }

  // External HTTP responses: fetch() and .json()/.text() result readers.
  if (calleeName(callee) === 'fetch') {
    sites.push({ node: call, kind: 'http-response', assignedName: assignedNameOf(call) })
  }
  if (
    ts.isPropertyAccessExpression(callee) &&
    (callee.name.text === 'json' || callee.name.text === 'text') &&
    call.arguments.length === 0 &&
    !NON_VALIDATOR_OBJECTS.has(rootIdentifierText(callee) ?? '')
  ) {
    sites.push({ node: call, kind: 'http-response', assignedName: assignedNameOf(call) })
  }

  // Queue consumers: amqplib .consume(queue, (msg) => ...), KafkaJS
  // .run({ eachMessage: async ({ message }) => ... }).
  if (calleeName(callee) === 'consume' || calleeName(callee) === 'run') {
    for (const arg of call.arguments) markQueueParams(arg, sites)
  }
}

/** Mark the first parameter of a function-like argument as a queue payload boundary. */
function markQueueParams(arg: ts.Expression, sites: BoundarySite[]): void {
  if (!ts.isArrowFunction(arg) && !ts.isFunctionExpression(arg)) {
    // KafkaJS style: { eachMessage: async (...) => ... }
    if (ts.isObjectLiteralExpression(arg)) {
      for (const property of arg.properties) {
        if (ts.isPropertyAssignment(property) && ['eachMessage', 'eachBatch'].includes(property.name.getText())) {
          markQueueParams(property.initializer, sites)
        }
      }
    }
    return
  }
  const firstParam = arg.parameters[0]
  if (firstParam !== undefined) {
    sites.push({ node: firstParam, kind: 'queue-payload' })
  }
}

function assignedNameOf(node: ts.Node): string | undefined {
  const parent = node.parent
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text
  if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text
  return undefined
}

function calleeName(callee: ts.Expression): string | undefined {
  if (ts.isIdentifier(callee)) return callee.text
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text
  return undefined
}

/** Leftmost identifier of a property access chain, e.g. "ctx" in ctx.request.body. */
function rootIdentifierText(node: ts.Node): string | undefined {
  let current = node
  while (ts.isPropertyAccessExpression(current)) current = current.expression
  return ts.isIdentifier(current) ? current.text : undefined
}
