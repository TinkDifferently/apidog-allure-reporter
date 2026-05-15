# apidog-reporter-allure

An [Apidog CLI](https://www.npmjs.com/package/apidog-cli) reporter plugin that writes results in [Allure](https://allurereport.org/) format.

Each test run produces structured XML in `./allure-results/`, which Allure then renders into an interactive HTML report with per-step request/response details, assertion results, and script error traces.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥ 6 | |
| Apidog CLI | `npm install -g apidog-cli` |
| Allure CLI | [Installation guide](https://allurereport.org/docs/install/) — needed to generate the HTML report |

---

## Installation

```bash
npm install -g apidog-reporter-allure
```

---

## Quick start

```bash
# Run a test scenario and collect Allure results
apidog run --access-token APS-xxxxx -t 123456 -r cli,allure

# Generate and open the HTML report
allure generate allure-results --clean -o allure-report
allure open allure-report
```

Results are written to `./allure-results/` in the working directory where the CLI is invoked.

---

## apidogExport.json

The reporter enriches every test with its folder path, tags, and numeric ID from the Apidog project tree. Place an `apidogExport.json` file in the working directory before running the CLI. Export it from Apidog via **Settings → Export → JSON**.

Without this file the reporter still produces valid Allure results — it just omits path-based labels (Epic / Feature / Story / Package).

---

## Reporter options

Pass options after `-r cli,allure` using `--reporter-allure-*`:

| Option | Type | Default | Description |
|---|---|---|---|
| `folderId` | number | — | When set, resolves the test path by folder ID instead of collection name |
| `issueLinkLabel` | string | `Related` | Allure label name used for issue tracker tags (see Tags below) |
| `issueLinkPattern` | string | `LB-\d+` | Regex pattern that identifies issue tracker tags (see Tags below) |

Example:

```bash
apidog run --access-token APS-xxxxx -t 123456 -r cli,allure \
  --reporter-allure-folderId 789 \
  --reporter-allure-issueLinkLabel TMS \
  --reporter-allure-issueLinkPattern "PROJ-\d+"
```

---

## Tags

Tags defined on a test case in `apidogExport.json` are interpreted as follows:

| Tag format | Example | Effect |
|---|---|---|
| Matches `issueLinkPattern` | `PROJ-42` | Added as an issue link label (label name controlled by `issueLinkLabel` option) |
| `Key=Value` | `Feature=Payments` | Added as an Allure label — overrides the path-derived Epic / Feature / Story / Component labels |
| Anything else | `smoke` | Added as a plain Allure tag (lowercased) |

The default pattern `LB-\d+` matches tags like `LB-42`. Override it to match your own tracker prefix:

```bash
--reporter-allure-issueLinkPattern "PROJ-\d+"   # Jira project key
--reporter-allure-issueLinkPattern "[A-Z]+-\d+" # any uppercase prefix
```

The `Component` label defaults to `Control-plane` when no `Component=…` tag is present.

---

## CSV iteration data (data-driven runs)

When Apidog runs a scenario with CSV iteration data, the reporter creates one Allure test per data row. The test name is `{scenario name}. {row name}` and each test receives the CSV column values as parameters.

---

## Allure TestOps integration

Set the following environment variables to automatically link each test result to an Allure TestOps test case (creating it if it does not exist):

| Variable | Description |
|---|---|
| `ALLURE_ENDPOINT` | TestOps server URL, e.g. `https://allure.example.com` |
| `ALLURE_TOKEN` | API token |
| `ALLURE_PROJECT_ID` | Numeric project ID |

When all three are set, the reporter authenticates via OAuth, searches for a test case matching the test name, creates one if none is found, and attaches the resulting ID as the `ALLURE_ID` label.

---

## Report structure

Each Allure test maps to one Apidog scenario execution and contains:

- **Parameters** — environment name and CSV iteration variables
- **Description** — list of HTTP calls in the scenario (`METHOD /path`)
- **Steps** — one top-level step per execution item:
  - *HTTP steps* include request headers/body, response status/headers/body, schema validation, response code validation, and per-assertion sub-steps
  - *Script steps* surface individual script errors as failed sub-steps
- **Labels** — framework, package path, epic/feature/story hierarchy, component, tags, and issue links derived from the folder tree and test tags

---

## Building from source

```bash
npm install
npm run build   # transpiles TypeScript via Babel and installs globally
npm run lint    # ESLint
```

Type-checking is separate from the build (Babel is used for transpilation):

```bash
npx tsc --noEmit
```

---

## License

[Apache 2.0](./LICENSE.md) — © Jury Skvortsov
