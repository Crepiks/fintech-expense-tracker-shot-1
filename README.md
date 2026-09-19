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

React + TypeScript with Vite, relative build paths, and Vitest with enforced 100% line and branch coverage. The initial app is a blank accessible application shell. Expense functionality follows in subsequent commits.

## Architecture

Pure domain functions will validate money and dates and derive totals. A storage adapter will validate localStorage data; a reducer and hook will own state. Accessible React components and plain CSS will render the UI. No UI, chart, router, or state libraries are used.

## Verification

`npm test` runs the full unit suite and enforces 100% coverage per application file. Only the React bootstrap is excluded because mounting the root belongs to the browser smoke test.

## Demo and screenshot

A deployment link and screenshot will be added when the core expense journey is available.

## Limitations

The app shell does not yet record expenses. No AI or external APIs are used at runtime.
