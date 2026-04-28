# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Build (transpiles TypeScript via Babel and installs globally)
npm run build

# Lint
npm run lint
```

The build script runs `babel --extensions .ts ./src -d ./dist` — note it uses Babel (not `tsc`) for transpilation, so TypeScript type errors do **not** block the build. Type checking must be done separately with `npx tsc --noEmit`.

## Architecture

This is a **reporter plugin** for the Apidog CLI. The entry point (`src/index.ts`) exports `allureReporter(app, options, collectionRunOptions)`, which Apidog calls when loading the `allure` reporter (`-r cli,allure`). The plugin is distributed as a CommonJS module (`dist/index.js`), also registered as the `apidog-allure-adapter` bin.

### Event-driven execution model

Apidog passes an `app` event emitter to the reporter. The plugin registers a listener on `app.on('done', ...)` and does all its work when that event fires with a `doneData` payload containing all executions, assertions, timings, and script errors.

### Two entry paths (folder vs. scenario mode)

- `options.folderId` is set → `handleFolder()` — resolves the test case path by folder name
- otherwise → `handleScenario()` — resolves by collection/scenario name

Both paths look up metadata from `apidogExport.json` (expected in the working directory at runtime) via `findTestCase()` in `src/models/apidogData.ts`, then delegate to `handleDone()`.

### Allure state machine (`src/allure/index.ts`)

A singleton `allureAdapter` wraps `AllureRuntime` from `allure-js-commons`. It maintains a stack for nested steps (`currentGroup → currentTest → currentStep → parent`). Steps nest by storing the current step as the `parent` of the new one; `endStep` pops back to the parent. Results are written to `./allure-results/`.

### Execution handlers

`handleDone.ts` is the orchestrator:
- **Single run** → `handleSingleRun()` processes sorted executions sequentially
- **Multi-iteration run** (CSV `iterationData`) → `handleMultiRun()` fans out one `handleSingleRun()` per data row via `Promise.all`, then calls `allure.endGroup()` after all resolve

Each execution item is dispatched by `item.metaInfo.type`:
- `'http'` → `handleHttp.ts`: adds request/response headers and body as step parameters, validates response code and JSON schema, records each assertion result as a sub-step
- `'script'` → `handleScript.ts`: records script errors as failed steps

### Allure TestOps integration (`src/allure/testops.ts`)

Activated only when `ALLURE_ENDPOINT`, `ALLURE_TOKEN`, and `ALLURE_PROJECT_ID` env vars are all set. For each test, `getId()` authenticates via OAuth, searches for a test case by name, creates one if missing, and returns the numeric ID. The ID is attached as the `ALLURE_ID` label on the Allure test. When any of the three env vars are absent, `getId()` returns `-1` and the test proceeds without TestOps binding.

### Key data model

`apidogExport.json` is parsed once at module load into a tree of `folder` / `testCase` nodes (`apidogData.ts`). `findTestCase(name, folderName?)` does a recursive tree walk to return `{ path, id, name, tags }` which becomes the `PACKAGE` label and tag set in the Allure report.
