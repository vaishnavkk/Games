### Summary of Changes
Provide a brief summary of the proposed changes, bug fixes, or enhancements.

### Associated Issue
Fixes #(issue number)

### Verification & Testing Checklist
Before requesting review, ensure the following local checks pass:

- [ ] **Build**: `npm run build` generates `dist/bundle.js` with zero errors.
- [ ] **Lint**: `npm run lint` passes with zero ESLint warnings or errors.
- [ ] **Data Validators**: `npm run validate` passes all 8 validation checks (clues, library tiers, source URLs, claims, palette collisions, contrast WCAG AA, data sync).
- [ ] **Unit & Integration Tests**: `npm test` passes 100% of test suites across all viewports.
- [ ] **Puppeteer Selfplay**: `npm run selfplay -- --smoke` passes with 0 failures and 0 warnings.
- [ ] **No Unwanted Artifacts**: No source maps, temporary images, or unstaged data files committed.
