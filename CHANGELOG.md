# Changelog

## [1.2.0] - 2026-05-15

### Added
- `issueLinkPattern` reporter option — configurable regex pattern for identifying issue tags (default: `LB-\d+`). Allows teams using different issue key formats to use the reporter without forking.
- Folder-level name matching in `getTestPath` — folder runs (via `folderId`) now resolve metadata correctly when the folder name matches instead of only matching leaf test cases.
- `id` and `tags` fields added to the `folder` type in `apidogData.ts`.
- Guard in `findTestCase` with diagnostic logging when `apiTestCaseCollection` is not an array.
- `handleScriptAssertions` — script assertion failures are now surfaced as individual named steps with failure messages, rather than being swallowed by the generic script error handler.
- Assertion failures in HTTP steps now call `allure.testStatus()` so the failure message propagates to the test-level status detail.

### Fixed
- Removed early-return guard in `allureAdapter.testStatus` — the last failure in a test now correctly overwrites earlier status details instead of being silently dropped.
- Script errors moved outside the HTTP step block so they appear at the correct nesting level in the report.
- `handleScriptErrors` no longer logs a spurious warning when `scriptErrors` is an empty array.

## [1.1.9]

- Parallel run isolation and per-run allure-results directories.

## [1.1.7]

- Add test description from HTTP steps.

## [1.1.6]

- Resolve EPIC/FEATURE/STORY from last 3 path segments.

## [1.1.5]

- Configurable issue link label, tag/kv improvements.
