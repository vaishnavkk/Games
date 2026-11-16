# GeoTrivia Release & Deployment Guide

This document details the release process, bundle production, GitHub Pages deployment architecture, and instructions for cutting new versions of **GeoTrivia: Earth Explorer**.

---

## 1. Release Checklist & Tagging

### Mandatory Pre-Release Checklist
Before tagging or cutting any release, verify locally:
- [ ] Working tree clean (`git status -s`).
- [ ] Run `npm run validate` locally (full suite including network sources check and cache verification).
- [ ] Run `npm test` across all viewports.
- [ ] Run `npm run selfplay -- --full --workers=4` (3 seeds, 123 games, 1,305 rounds, 0 failures, 0 warnings).
- [ ] Verify `dist/bundle.js` is committed with no source maps (`.map`).
- [ ] Ensure version is bumped in `package.json` and documented in `CHANGELOG.md`.

### Step 1: Pre-Release Verification Gate
Before cutting a release or bumping versions, execute the full local validation suite:

```bash
cd earth-trivia

# 1. Compile production bundle
npm run build

# 2. Lint source code
npm run lint

# 3. Execute all 8 data, clue, and UI contrast validators
npm run validate

# 4. Run automated unit & integration test suites
npm test

# 5. Run full Puppeteer self-play matrix (3 seeds, 123 games, 1,305 rounds)
npm run selfplay -- --full --workers=4
```

### Step 2: Update Version Metadata
Ensure `package.json` reflects the target version (e.g., `"version": "1.0.1"`) and update `CHANGELOG.md` with release notes adhering to Semantic Versioning.

### Step 3: Create Local Git Tag
Create an annotated Git tag on the release commit:

```bash
git tag -a v1.0.1 -m "Release v1.0.1: Reorganization, documentation, CI, and clue verification"
```

### Step 4: Publish to Remote (When authorized)
When ready to push to remote:

```bash
git push origin main --tags
```

---

## 2. Production Bundle Generation (`dist/`)

The production distribution is generated using `esbuild`:

```bash
npm run build
# Executes: esbuild src/main.js --bundle --outfile=dist/bundle.js --format=esm --minify
```

### Key Bundle Characteristics:
- **Zero Runtime Dependencies**: All Three.js geometry, TopoJSON decoders, and canvas rendering logic are compiled into a standalone, tree-shaken ESM bundle (`dist/bundle.js`).
- **Build Duration**: Compiles in ~200 milliseconds.
- **Source Maps**: Production builds deliberately omit source maps to prevent exposing source layout and reduce repository size.
- **Debug Builds**: For development debugging with maps, run `npm run build:debug`, which writes unminified bundles and source maps to the gitignored directory `dist/debug/`.

---

## 3. GitHub Pages Deployment Architecture (Current State)

### Current Setup: Direct Branch Serving
- **Hosting Method**: GitHub Pages is configured in Repository Settings to serve directly from the **`main` branch** at repository root (`/`).
- **Tracked Bundle**: `dist/bundle.js` is committed and tracked in Git.
- **Entry Points**:
  - Root `index.html`: The Arcade Portal launcher.
  - `earth-trivia/index.html`: GeoTrivia's entry point, which directly imports `<script type="module" src="./dist/bundle.js"></script>`.
- **Deployment Velocity**: Any push to `main` instantly goes live on GitHub Pages with zero CI build latency or container overhead.

---

## 4. Switching Pages to GitHub Actions (Optional Future Enhancement)

If the repository transitions to automated artifact deployment so that `dist/bundle.js` does not need to be committed to version control, follow these steps:

1. **Update `.gitignore`**:
   Remove `!dist/bundle.js` and add `dist/` to `.gitignore`.
2. **Untrack Distribution**:
   ```bash
   git rm --cached earth-trivia/dist/bundle.js
   ```
3. **Configure GitHub Pages**:
   Navigate to **Settings > Pages > Build and deployment > Source** and select **GitHub Actions**.
4. **Create Deployment Workflow** (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version-file: 'earth-trivia/.nvmrc'
         - run: cd earth-trivia && npm ci && npm run build
         - uses: actions/configure-pages@v4
         - uses: actions/upload-pages-artifact@v3
           with:
             path: '.'
         - uses: actions/deploy-pages@v4
   ```
