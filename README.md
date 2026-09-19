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

React + TypeScript with Vite, relative build paths, and Vitest with enforced 100% line and branch coverage. The domain layer parses amounts into exact integer minor units, validates real calendar dates and categories, and derives monthly totals. Validated localStorage persistence, a pure reducer, and a React hook now support adding, removing, restoring, budget settings, and cross-tab updates. The UI is still an application shell.

## Architecture

Pure domain functions validate money and dates and derive totals. An isolated storage adapter validates localStorage data; a reducer and hook own state. Corrupt payloads are backed up when storage permits; invalid and duplicate records are dropped. Read/write failures become notices and the current tab remains usable. Accessible React components and plain CSS will render the UI. No UI, chart, router, or state libraries are used.

## Verification

`npm test` runs the full unit suite and enforces 100% coverage per application file. Only the React bootstrap is excluded because mounting the root belongs to the browser smoke test.

## Demo and screenshot

A deployment link and screenshot will be added when the core expense journey is available.

## Limitations

The app shell does not yet record expenses. Currency is USD; each amount is limited to 999,999,999.99, with a 10,000-record cap to keep aggregate arithmetic exact. No AI or external APIs are used at runtime.
