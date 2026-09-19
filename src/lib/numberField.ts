/**
 * Number inputs you can actually clear.
 *
 * A controlled input whose handler reads `Number(text) || 0` can never be
 * emptied: delete the last digit and the value becomes 0, which re-renders as
 * "0" sitting under the caret, so the field fights every edit that starts by
 * clearing it. The same bite eats a decimal point — type "2." and it snaps
 * back to "2" before you can reach the 5.
 *
 * The fix is to keep what is being typed apart from the number it parses to.
 * {@link parseFieldNumber} is that parse, kept pure so the rules can be
 * tested; {@link useNumberField} holds the text while the field has focus.
 */

import { useState, type ChangeEvent } from 'react'

/**
 * What a field's text is worth to everything downstream.
 *
 * An empty box counts as zero rather than refusing to parse, because the pot
 * still has to add up while someone is halfway through retyping a stack. It
 * is the *text* that stays empty, not the model.
 */
export function parseFieldNumber(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * A stored value as its field should read, in whatever unit the field is in.
 *
 * Scaled fields round the text to two decimals: a stack of 12,345 chips is
 * 12.35 big blinds on screen, and the chips behind it are left alone unless
 * somebody actually types. An unscaled field is shown exactly as stored,
 * because a bounty of 2.50 must not become 2.5 of anything.
 */
export function scaledFieldText(value: number, scale: number): string {
  if (!Number.isFinite(value)) return ''
  if (scale === 1) return String(value)
  return String(Math.round((value / scale) * 100) / 100)
}

export interface NumberFieldProps {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
}

/**
 * Wiring for a clearable number input, optionally denominated in something
 * other than what is stored.
 *
 * The typed text is kept only while the field has focus. Blur drops it and
 * the canonical number shows again, so a value changed from elsewhere — a new
 * seat selected, bounties re-derived from a new buy-in — still appears at once
 * whenever the user is not mid-edit. Switching units blurs the field on the
 * way to the toggle, so the draft never survives into the wrong unit.
 *
 * `scale` is how many stored units one typed unit is worth: pass the big
 * blind to type in big blinds, and leave it at 1 to type the stored number.
 */
export function useNumberField(
  value: number,
  onChange: (value: number) => void,
  scale = 1,
): NumberFieldProps {
  const [draft, setDraft] = useState<string | null>(null)
  const factor = Number.isFinite(scale) && scale > 0 ? scale : 1

  // Changing units throws the draft away. Relying on the toggle to blur the
  // field would leave a number stranded in the wrong unit on any browser that
  // does not focus a button when it is clicked.
  const [lastFactor, setLastFactor] = useState(factor)
  if (factor !== lastFactor) {
    setLastFactor(factor)
    setDraft(null)
  }

  return {
    value: draft ?? scaledFieldText(value, factor),
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      setDraft(raw)
      const parsed = parseFieldNumber(raw)
      // Chips are whole; an unscaled field may hold money, which is not.
      onChange(factor === 1 ? parsed : Math.round(parsed * factor))
    },
    onBlur: () => setDraft(null),
  }
}
