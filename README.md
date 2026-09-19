# Pocket Ledger

A local-only expense tracker for people who want a clear view of everyday spending. The project is being implemented in the numbered stages in [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md).

## Launch

Requires Node.js 22.12+ and npm. No API keys or environment setup are needed.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

## Current implementation

React + TypeScript with Vite, relative build paths, and Vitest with enforced 100% line and branch coverage. The domain layer parses amounts into exact integer minor units, validates real calendar dates and categories, and derives monthly totals. Validated localStorage persistence, a pure reducer, and a React hook now support adding, removing, restoring, budget settings, and cross-tab updates. The responsive UI supports adding and deleting expenses with a five-second Undo that restores the same record and id, month navigation, category totals and percentages, clear validation errors, future-date warnings, and a link to records saved in another month. An accessible SVG donut and named legend filter transactions by category; filtering never changes the month’s overall totals.

A monthly budget applies the same limit to each month. The budget card derives spent, remaining, and progress from the selected month. For the current month only, it divides remaining minor units across the days left, including today, rounds down, and clamps the daily allowance to zero when over budget. Empty input clears the limit.

## Architecture

Pure domain functions validate money and dates and derive totals. An isolated storage adapter validates localStorage data; a reducer and hook own state. Corrupt payloads are backed up when storage permits; invalid and duplicate records are dropped. Read/write failures become notices and the current tab remains usable. Accessible React components and plain CSS render the UI. No UI, chart, router, or state libraries are used.

## Verification

Use **Run validation scenario** in the footer. Its modal compares expected and actual totals for the required add/delete scenario using the real reducer entirely in memory. It never reads or modifies your stored expenses.

`npm test` runs the full unit suite and enforces 100% coverage per application file. Only the React bootstrap is excluded because mounting the root belongs to the browser smoke test.

## Demo and screenshot

The core flow has been checked in the in-app browser: add Food 1,500, Transportation 600, and Food 900 → total 3,000; delete Food 900 → 2,100; reload and switch months. A deployment link and screenshot follow after publication.

## Limitations

Currency is USD; each amount is limited to 999,999,999.99, with a 10,000-record cap to keep aggregate arithmetic exact. No AI or external APIs are used at runtime.
