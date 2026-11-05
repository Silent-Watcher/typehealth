import pc from 'picocolors'

const COLOR_FNS = {
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  cyan: pc.cyan,
  gray: pc.gray,
  bold: pc.bold,
} as const

export type ColorName = keyof typeof COLOR_FNS

/** Color is enabled only when the stream is a TTY and picocolors' env checks pass (NO_COLOR etc.). */
export function supportsColor(stream: { isTTY?: boolean } = process.stdout): boolean {
  return stream.isTTY === true && pc.isColorSupported
}

export function colorize(text: string, color: ColorName, enabled: boolean): string {
  return enabled ? COLOR_FNS[color](text) : text
}

/** Render a filled progress bar. Values outside [0, max] are clamped.
 *  Custom (not cli-progress): this is a static report bar, not a live-updating widget. */
export function progressBar(value: number, max: number, width = 20, enabled = false): string {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const filled = Math.round(ratio * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}
