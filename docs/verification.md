# Verification evidence

## Node.js runtime pin — 20 September 2026

The runtime configuration change was verified on macOS arm64 using Node.js **24.21.0** and bundled npm **11.19.0**, selected by `nvm use` from `.nvmrc`. The official binary checksum matched during `nvm install`. Application code and the dependency lockfile were unchanged from trunk revision `4469c29`.

- A fresh `npm ci --engine-strict --cache /tmp/pocket-ledger-node24-npm-cache --no-audit --no-fund --fetch-retries=0` installed all locked dependencies with no engine incompatibilities. The first sandboxed attempt encountered DNS restrictions; the network-enabled retry succeeded.
- `npm test` passed all **174 tests in 18 files**, including the existing user-flow integration tests. Coverage remained **100%**: 283/283 lines, 188/188 branches, 333/333 statements, and 102/102 functions, with the existing per-file thresholds enforced.
- `npm run typecheck` and `npm run build` passed.
- GitHub Actions now reads `.nvmrc` through `node-version-file`. The hosted workflow has not been run for this local change.

The browser checks below are historical evidence from 19 September, not a new browser run under Node.js 24.

## Original application verification — 19 September 2026

Verified on 19 September 2026 using Node.js 22.22.0 and npm 10.9.4. Application revision: `176907e`. The later documentation and CI commits do not change application behavior.

## Reproducible checks

A fresh archive of the committed application was extracted into an empty temporary directory, without the working checkout’s `node_modules`, build output, or browser data.

| Command | Observed result |
| --- | --- |
| `npm ci` | Installed the locked dependencies successfully |
| `npm test` | 174 tests passed across 18 files |
| Coverage: lines | 100% — 283/283 |
| Coverage: branches | 100% — 188/188 |
| Coverage: statements | 100% — 333/333 |
| Coverage: functions | 100% — 102/102 |
| `npm run build` | Strict TypeScript check and Vite production build passed |
| `npm run preview -- --port 4173` | Production app served successfully on localhost |

Coverage thresholds apply to each application file. The React root mount in `src/main.tsx` is the only exclusion, with an explanatory comment in `vite.config.ts`. The production-browser checks below exercise that mount. Tests fake external boundaries rather than replacing the reducer, calculations, or components being tested.

## Browser checks

The following checks were performed in the Codex in-app browser with synthetic records:

- Added Food 1,500, Transportation 600, and Food 900. The total became 3,000, Food 2,400, and Transportation 600. Reload preserved all records and totals.
- Deleted Food 900. The total became 2,100 and Food 1,500; another reload preserved the deletion. Empty neighboring months showed zero, and navigating back restored the selected month’s totals.
- Deleted and restored an expense using Undo. A second same-origin tab reflected both changes and budget updates.
- Ran the isolated validation modal: all eight expected/actual checks passed and the real ledger was unchanged. Escape closed the dialog; explicit close returned focus to the launcher.
- Submitted empty, zero, negative, alphabetic, exponent, and excessive-precision amounts. Each produced an understandable field error. Keyboard navigation could select a category, traverse the native date field, submit an expense, and return to the amount input.
- Filtered Food through the chart/legend. Only the list was filtered; the monthly total and budget remained unchanged. Clearing the filter restored the full list.
- Set a 5,000 budget for 3,000 spending: remaining 2,000 and daily allowance 166.66 across 12 days including the verification date.
- Loaded a deliberately malformed storage payload. The app displayed a recovery/backup notice and a usable empty ledger without a console error. The temporary storage fixture page was removed afterward.
- Inspected the desktop and 390px-wide mobile layouts. Mobile document width equalled viewport width (390px); the table scrolls inside its panel. Screenshots are in `docs/screenshots/`.
- On the freshly built production app’s separate origin, entered `1500,50`, saved a future-month 600 expense through the native date control, followed the month-switch link, and set a 500 budget. October showed spending 600, over budget by 100, progress capped at 100%, and no current-day allowance. Reload and navigation preserved the record. The production validation modal passed all eight checks.
- Browser warning/error logs were empty after the production flow.

## Review fixes and regression tests

An independent code review identified three cases that were reproduced and fixed before the final checks:

1. A delayed storage event could replay an older snapshot. Synchronization now reads current storage; the regression test verifies that a subsequent budget save retains the newer records.
2. Daily guidance could retain yesterday’s date in a long-open tab. A local clock hook now refreshes at midnight and on focus/visibility changes; fake-clock tests cover rollover and cleanup.
3. Undo could silently fail if another tab refilled the 10,000-record limit. The UI now explains which expense could not be restored; an integration test covers the limit race.

## Limits of this evidence

These are local results, not a claim that every browser or device has been tested. Safari, Firefox, physical phones, and a screen reader were not separately exercised. Blocked/full storage, clock rollover, and the 10,000-record race were tested with deterministic boundary fakes; real-browser checks covered persistence, synchronization, and malformed-data recovery. Truly simultaneous tab edits remain last-write-wins as documented in the README.

Recognizable credential patterns were checked across tracked Git history with no matches. This is a hygiene check, not a security audit. Strict TypeScript unused-symbol checks pass; application/test files are below 300 lines; runtime dependencies are limited to React and React DOM.

The GitHub Actions workflow is provided separately from these local results. Its actual status is visible on the pull request. Public hosting remains pending approval for the separate deployment destination; no live demo or public-browser deployment check is claimed.
