# Verification evidence

## Base-branch integration — 20 September 2026

Merged trunk revision `8096c18` into the add-ons branch. Documentation conflicts were resolved by retaining the pinned Node.js setup and the add-on verification history. No application source or dependency lockfile changed during conflict resolution.

Using `nvm use` selected Node.js **24.21.0** and npm **11.19.0**. `npm ci --engine-strict --no-audit --no-fund`, `npm test`, `npm run typecheck`, and `npm run build` passed. All **211 tests in 19 files** passed with **100% lines (314/314), branches (245/245), statements (369/369), and functions (113/113)**. npm emitted a non-blocking install-script notice for optional `fsevents`; installation and all checks completed successfully. `diff -r .agents/skills .claude/skills` confirmed identical shared skill copies.

The browser checks and deployment below remain evidence for the unchanged application revision; they were not repeated for this documentation/runtime merge.

## Historical Node.js runtime pin — 20 September 2026

The runtime configuration change was verified on macOS arm64 using Node.js **24.21.0** and bundled npm **11.19.0**, selected by `nvm use` from `.nvmrc`. The official binary checksum matched during `nvm install`. Application code and the dependency lockfile were unchanged from trunk revision `4469c29`.

- A fresh `npm ci --engine-strict --cache /tmp/pocket-ledger-node24-npm-cache --no-audit --no-fund --fetch-retries=0` installed all locked dependencies with no engine incompatibilities. The first sandboxed attempt encountered DNS restrictions; the network-enabled retry succeeded.
- `npm test` passed all **174 tests in 18 files**, including the existing user-flow integration tests. Coverage remained **100%**: 283/283 lines, 188/188 branches, 333/333 statements, and 102/102 functions, with the existing per-file thresholds enforced.
- `npm run typecheck` and `npm run build` passed.
- GitHub Actions was updated to read `.nvmrc` through `node-version-file`. These results describe the runtime-pin change before integration with the add-ons.

## Add-ons verification — 20 September 2026

Verified locally with Node.js 22.22.0 before integrating the runtime pin. These results cover the add-ons branch and the existing core together.

## Automated checks

- `npm ci`: dependency installation succeeded; no new dependencies were added. A fresh clone of the published `feat/expense-addons` branch in a separate temporary directory also passed `npm ci`, `npm test` (211 tests, 100% coverage), and `npm run build`. This was on the same machine.
- `npm test`: **211 tests passed across 19 files**. V8 reports **100% lines (314/314), branches (245/245), statements (369/369), and functions (113/113)**. Per-file thresholds remain 100%; only the React mounting entry point is excluded with its existing explanation.
- `npm run typecheck` and `npm run build`: passed. Vite emits relative static assets in `dist/`.
- An independent read-only review found no actionable code issues and independently ran the same passing coverage suite.
- New behavior tests cover ten validation results; no storage reads/writes during validation; dialog rerun and closing; sorted/dimmed donut slices; filter reset after deletion; budget persistence, percentage and daily guidance through add/delete/undo; stipend clamping, leap years, same-day and year rollover; old version-1 settings defaults; cross-tab settings; and missing `crypto.randomUUID`.

## Production browser checks

Used bundled Playwright with a fresh, isolated Chrome 153.0.8010.52 context against `npm run preview -- --port 4175` at `http://127.0.0.1:4175/`. The Browser plugin/skill was not available, so ordinary Playwright was used. No user browser data was accessed.

- Page identity and main content rendered, without a framework error overlay.
- Added Food 1,500, Transportation 600, Food 900: overall 3,000; Food 2,400 (80%); Transportation 600 (20%).
- Validation modal showed ten PASS rows, including after Run again. Escape closed it. Stored data was byte-for-byte identical before and after.
- Filtering Food showed two records with total still 3,000. Deleting Food 900 changed total to 2,100, Food to 1,500 (71%), Transportation to 600 (29%).
- Deleting the last filtered Food record cleared the filter. Undo restored the record. Month navigation also cleared an active filter.
- Budget 5,000 with spent 2,100 showed remaining 2,900 and 42% used. Reload preserved expenses, budget, and stipend. A previous month hid daily guidance.
- A second tab changed budget to 6,000 and stipend day to 31; the first tab updated. On September 20, the countdown targeted September 30, ten days away.
- Desktop 1440×1100 and mobile 390×844 screenshots were inspected. No page-width overflow; the narrow transaction table scrolls within its panel. [Desktop](screenshots/desktop.png), [mobile](screenshots/mobile.png), [validation](screenshots/validation.png).
- After the browser was set offline, adding another expense worked and the total changed from 2,100 to 2,125. Offline reload failed, as expected: the app has no service worker and does not promise offline reload support.
- Network requests were limited to the same-origin document, compiled JS, CSS, and favicon. No external runtime requests. The initial missing favicon was fixed with a local SVG; the repeated browser flow completed with no warning/error console messages or page errors before the intentional offline reload.

## Limits and delivery

These are local results, not a claim of validation on another physical machine. Firefox, Safari, old browsers, screen readers, and physical phones were not separately tested. Storage failure, clock rollover, and legacy migration use deterministic unit tests. Simultaneous tab edits still follow last-write-wins.

Sites reported a successful owner-only deployment of application revision `330260a` at [Pocket Ledger](https://pocket-ledger-expenses.crepiks.chatgpt.site). The final follow-up documentation change does not alter its built assets. The owner explicitly chose to keep the Site owner-only after automatic approval review blocked audience expansion. Public access is outside the final delivery scope; anonymous public-browser verification is not claimed.

GitHub Actions `test-and-build` passed for application revision `330260a` on [PR #6](https://github.com/Crepiks/fintech-expense-tracker-shot-1/pull/6). A recognizable credential-pattern scan of tracked history found no matches; this is a hygiene check, not a security audit. No application TypeScript file exceeds 300 lines.
