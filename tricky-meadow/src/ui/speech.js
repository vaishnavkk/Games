/**
 * Cancels any active speech synthesis utterance safely.
 * @param {Window|undefined} win
 */
export function cancelSpeech(win = typeof window !== 'undefined' ? window : undefined) {
  if (win && typeof win.speechSynthesis?.cancel === 'function') {
    try {
      win.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Reads a puzzle prompt and item labels aloud when Web Speech API is available.
 * @param {{ prompt?: string, items?: Array<{ label?: string }> }|null} puzzle
 * @param {Window|undefined} win
 * @returns {boolean}
 */
export function readPuzzleAloud(puzzle, win = typeof window !== 'undefined' ? window : undefined) {
  if (
    !puzzle ||
    !win ||
    typeof win.SpeechSynthesisUtterance !== 'function' ||
    typeof win.speechSynthesis?.speak !== 'function'
  ) {
    return false;
  }
  cancelSpeech(win);
  try {
    const itemsText = Array.isArray(puzzle.items) ? puzzle.items.map(i => i.label).join(', ') : '';
    const text = itemsText ? `${puzzle.prompt}. ${itemsText}` : `${puzzle.prompt}`;
    const utterance = new win.SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    win.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
