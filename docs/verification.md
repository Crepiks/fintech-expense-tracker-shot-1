# Verification evidence

Verified locally on 2026-09-20 with Node.js 22.22.0. These results cover the add-ons branch and the existing core together.

## Automated checks

- `npm ci`: clean dependency installation succeeded; no new dependencies were added.
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

The Sites project currently has owner-only access. Automatic approval review rejected public audience expansion as requiring explicit authorization for that exact access change. A public URL and anonymous-browser check are not claimed. Deployment and CI results are reported separately from local checks.
