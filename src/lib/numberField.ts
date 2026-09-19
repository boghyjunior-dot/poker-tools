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

export interface NumberFieldProps {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
}

/**
 * Wiring for a clearable number input.
 *
 * The typed text is kept only while the field has focus. Blur drops it and
 * the canonical number shows again, so a value changed from elsewhere — a new
 * seat selected, bounties re-derived from a new buy-in — still appears at once
 * whenever the user is not mid-edit.
 */
export function useNumberField(
  value: number,
  onChange: (value: number) => void,
): NumberFieldProps {
  const [draft, setDraft] = useState<string | null>(null)

  return {
    value: draft ?? (Number.isFinite(value) ? String(value) : ''),
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value
      setDraft(raw)
      onChange(parseFieldNumber(raw))
    },
    onBlur: () => setDraft(null),
  }
}
