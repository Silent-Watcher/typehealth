/** Version of the JSON report schema. Bump on any breaking shape change. */
export const SCHEMA_VERSION = 1

/** One-line definitions embedded in JSON reports so they are self-describing. */
export const METRIC_DEFINITIONS: Record<string, string> = {
  typeCoverage:
    'typedPositions / eligiblePositions. Eligible positions: variable/parameter names and function/method/getter return types (constructors and setters excluded). null when no eligible positions.',
  eligiblePositions:
    'Count of measurable type positions: variable/catch declarations, function parameters, and function/method/getter return types.',
  typedPositions: 'Count of eligible positions whose checker-resolved type is not any (unknown counts as typed).',
  explicitAny: 'Count of any keywords in type positions (annotations, type arguments, assertion targets).',
  implicitAny:
    'Eligible positions whose checker type is any and whose explicit annotation (if any) contains no any keyword.',
  unsafeAssertions:
    'Type assertions to any (high), double assertions (medium), or between unrelated types (medium). Legitimate assertions are not counted.',
  nonNullAssertions: 'Count of postfix ! operators.',
  suppressions:
    'Type suppression comments honored by tsc: @ts-ignore, @ts-nocheck (file start only), @ts-expect-error, in single-line comments.',
  runtimeBoundaries:
    'Heuristic count of external data boundaries (JSON.parse, HTTP request data, HTTP responses, queue payloads) without a recognized validation step. Uncertain by definition; not a taint analysis.',
  weakStrictnessFlags:
    'Count of supported strictness compiler options not effectively enabled (strict enables sub-flags unless explicitly false).',
}
