# GRAVITAS — Workspace Agent Rules

Model-agnostic reliability runtime for coding agents.
Canonical skill: `.agents/skills/gravitas/SKILL.md`
Rules: `.agents/rules/gravitas-invariants.md`

## Kernel Invariants

1. Read target + callers before editing.
2. Writes stay inside declared scope.
3. Completion needs fresh validator evidence (stale evidence blocks).
4. Never exact-retry a failure; change diagnosis, context, or strategy first.
5. Contract criteria + required validators gate completion.
6. Mark unverifiable claims explicitly.

## Work Procedure

1. **Reconnaissance**: Read the target file, understand current mechanics and structure.
2. **Planning**: Emit policy record and decision record for significant changes.
3. **Execution**: Make precise, scoped changes.
4. **Verification**: Verify functionality and evidence.
5. **Report**: State what changed, evidence, and rationale.
