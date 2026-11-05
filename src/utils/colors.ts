const CODES = {
  red: '31',
  green: '32',
  yellow: '33',
  cyan: '36',
  gray: '90',
  bold: '1',
} as const

export type ColorName = keyof typeof CODES

/** Color is enabled only when the stream is a TTY and NO_COLOR is unset. */
export function supportsColor(stream: { isTTY?: boolean } = process.stdout): boolean {
  if (process.env.NO_COLOR !== undefined) return false
  return stream.isTTY === true
}

export function colorize(text: string, color: ColorName, enabled: boolean): string {
  return enabled ? `\x1b[${CODES[color]}m${text}\x1b[0m` : text
}

/** Render a filled progress bar. Values outside [0, max] are clamped. */
export function progressBar(value: number, max: number, width = 20, enabled = false): string {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const filled = Math.round(ratio * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}
