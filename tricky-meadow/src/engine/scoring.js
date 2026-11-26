// Tricky Meadow — Scoring, Star Calculation & Answer Checking Engine

/**
 * Star calculation rules:
 * - 3 stars: first try without hint (tries === 0 && !hintUsed)
 * - 2 stars: hint used OR 1 retry (tries === 1 || (tries === 0 && hintUsed))
 * - 1 star: anything else (tries >= 2)
 */
export function calculateStars({ tries = 0, hintUsed = false } = {}) {
  if (tries === 0 && !hintUsed) {
    return 3;
  }
  if (tries === 1 || (tries === 0 && hintUsed)) {
    return 2;
  }
  return 1;
}

/**
 * Level unlock rules:
 * - Level 1: Always unlocked
 * - Level 2 & 3: Unlock after 4 of 6 puzzles in previous level are solved (stars > 0)
 */
export function countSolvedPuzzlesInLevel(level, progressStars, puzzles) {
  if (!puzzles || !Array.isArray(puzzles)) return 0;
  const levelPuzzles = puzzles.filter(p => p.level === level);
  let solved = 0;
  for (const p of levelPuzzles) {
    const s = progressStars?.[p.id];
    if (typeof s === 'number' && Number.isInteger(s) && s >= 1 && s <= 3) {
      solved++;
    }
  }
  return solved;
}

export function isLevelUnlocked(level, progressStars = {}, puzzles = []) {
  if (level <= 1) return true;
  const prevLevel = level - 1;
  const solvedInPrev = countSolvedPuzzlesInLevel(prevLevel, progressStars, puzzles);
  return solvedInPrev >= 4;
}

/**
 * Answer checking:
 * - pick: userChoice === puzzle.answer
 * - tapall: userChoice is array matching all elements of puzzle.answer (set equality)
 * - order: userChoice is array matching puzzle.answer in exact sequence
 */
export function checkAnswer(puzzle, userChoice) {
  if (!puzzle || userChoice === undefined || userChoice === null) return false;

  if (puzzle.type === 'pick') {
    return String(userChoice) === String(puzzle.answer);
  }

  if (puzzle.type === 'tapall') {
    if (!Array.isArray(userChoice) || !Array.isArray(puzzle.answer)) return false;
    if (userChoice.length !== puzzle.answer.length) return false;
    const ansSet = new Set(puzzle.answer.map(String));
    return (
      new Set(userChoice).size === puzzle.answer.length &&
      userChoice.every(id => ansSet.has(String(id)))
    );
  }

  if (puzzle.type === 'order') {
    if (!Array.isArray(userChoice) || !Array.isArray(puzzle.answer)) return false;
    if (userChoice.length !== puzzle.answer.length) return false;
    return userChoice.every((item, idx) => String(item) === String(puzzle.answer[idx]));
  }

  return false;
}
