# GRAVITAS — Antigravity Rules

When executing coding tasks, follow the GRAVITAS skill loaded from `.agents/skills/gravitas/SKILL.md`.

## Non-Negotiable (6 invariants -- canonical: `.agents/skills/gravitas/SKILL.md`)

1. **Ground before mutating** -- read target + tests + callers before editing.
2. **Stay in declared scope** -- writes outside `allowed_write_scope` are denied.
3. **Completion needs evidence** -- fresh executable validator PASS only; stale evidence and self-review do not count.
4. **Never exact-retry a failure** -- change diagnosis, context, or strategy before re-attempting.
5. **Satisfy the contract** -- criteria + required validators gate completion.
6. **Say what you can't verify** -- mark unverifiable claims explicitly instead of fabricating certainty.

## Tier Classification

Planning is conditional:
- `direct`: trivial, localized single-file edits.
- `compact`: dependent changes, moderate scope.
- `deep`: security, architecture, broad blast radius.
- `replan`: assumptions invalidated or scope grew.

## Verification

Run checks and cite output:
- Web / JS: browser runtime verification, console error checks, syntax and functional testing.

## Output Format

```markdown
## What Changed
[files, behavior]

## Evidence
[command output or verifiable observation]

## Why
[rationale]
```

## Conditional Roles

Default to one agent. Load investigator, verifier, or impact-auditor roles from `.agents/agents/` when required by complexity.
