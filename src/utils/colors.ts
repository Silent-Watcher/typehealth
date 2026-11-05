import { styleText } from 'node:util'

export type ColorName = 'red' | 'green' | 'yellow' | 'cyan' | 'gray' | 'bold'

/** Color is enabled only when the stream is a TTY and NO_COLOR is unset. */
export function supportsColor(stream: { isTTY?: boolean } = process.stdout): boolean {
  if (process.env.NO_COLOR !== undefined) return false
  if (process.env.TERM === 'dumb') return false
  return stream.isTTY === true
}

/** styleText itself validates against process.stdout (NO_COLOR, TTY), so an
 *  enabled=true colorize can still degrade to plain text automatically. */
export function colorize(text: string, color: ColorName, enabled: boolean): string {
  return enabled ? styleText(color, text) : text
}

/** Render a filled progress bar. Values outside [0, max] are clamped.
 *  Custom (not cli-progress): this is a static report bar, not a live-updating widget. */
export function progressBar(value: number, max: number, width = 20, enabled = false): string {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const filled = Math.round(ratio * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}
