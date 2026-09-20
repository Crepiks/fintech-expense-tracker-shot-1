# Pocket Ledger

A private, local-only expense tracker for people who want a clearer view of everyday spending. Record an expense, see where the month’s money went, and compare it with a simple monthly budget.

Small purchases are easy to lose track of, and spreadsheets take effort to maintain. Pocket Ledger makes the daily entry quick and keeps every total derived from the same monthly records, so adding or deleting an expense updates the whole picture immediately.

![Pocket Ledger with sample expenses and a monthly budget](docs/screenshots/desktop.png)

[Phone layout](docs/screenshots/mobile.png). Screenshots use synthetic example records; a new browser starts empty.

[Deployed demo — owner-only access](https://pocket-ledger-expenses.crepiks.chatgpt.site). Access is intentionally limited to the owner.

## Launch

Requires **Node.js 22.12+** and npm; verified with Node.js **22.22.0**. No API keys, accounts, or environment variables are needed.

```sh
git clone https://github.com/Crepiks/fintech-expense-tracker-shot-1.git
cd fintech-expense-tracker-shot-1
npm install
npm run dev
```

Open the localhost URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm test              # Full unit/component suite, enforcing 100% coverage
npm run typecheck     # Strict TypeScript check, including tests
npm run build         # TypeScript check and production files in dist/
npm run preview       # Serve the production build locally
```

For a reproducible installation, use `npm ci`. `npm run test:watch` runs tests during development. The GitHub Actions workflow runs `npm ci`, `npm test`, and `npm run build` for feature/fix pushes and PRs to `trunk`.

## Implemented features

- Add expenses with an amount, fixed category, real calendar date, and optional description.
- Accept `1500`, `1 500`, `1,500`, `1500,50`, and `1500.5`; reject zero, negatives, exponent notation, and more than two decimal places with field-level messages.
- Navigate months with previous/next buttons. The list, total, category amounts, chart, and budget all use the same month’s records.
- Delete immediately; Undo restores the same record and id for five seconds. Another deletion replaces the previous Undo. A refilled record limit produces an explicit restore notice.
- Persist expenses and settings across reloads. Corrupt storage is recovered with a visible notice and a raw backup when space permits; invalid/duplicate records are removed.
- Synchronize same-origin tabs. Delayed events read the current stored snapshot rather than replaying stale content.
- Show clear warnings for unavailable/full storage while keeping the current tab usable.
- Warn about future dates without rejecting them; offer a month-switch link when an entry belongs elsewhere.
- Filter the transaction list through a keyboard-accessible SVG donut or named legend. Slices are sorted by spending and inactive slices dim. Filtering shows the matching record count without altering the month’s overall total or budget, and resets when changing month or deleting the category’s last expense.
- Set or clear a monthly budget. See spent, remaining, actual percentage used, capped progress, a warning at 80%, and an explicit over-budget amount. Use Edit to change settings.
- For the current month, show a daily allowance: remaining minor units divided by days left including today, rounded down. The allowance is hidden when the budget is exhausted or exceeded. The local date refreshes at midnight and when a suspended tab returns.
- Set an optional stipend day (1–31). A separate countdown clamps to the last day of shorter months, including leap years; it never changes the calendar-month budget. Expenses, budget, and stipend day survive refresh and synchronize across same-origin tabs.
- Run the isolated validation scenario from the footer. A native modal shows expected/actual results and restores keyboard focus when closed.
- Use labelled native controls, live field errors/status messages, visible focus, and a responsive layout. On narrow screens the transaction table scrolls within its panel.

## How to verify

Choose **Run validation scenario** in the footer. It executes the real reducer and calculation functions in memory and never reads or modifies your stored expenses. All ten checks should pass:

| Operation | Total | Food | Transportation |
| --- | ---: | ---: | ---: |
| Add Food 1,500; Transportation 600; Food 900 | 3,000 | 2,400 | 600 |
| Delete Food 900 | 2,100 | 1,500 | 600 |

Each stage also verifies the record count and that category sums equal the total. Use **Run again** to repeat the scenario without closing it. To verify persistence yourself, enter the same three records in one month, reload, delete the 900 record, reload again, then switch months and back. Open a second tab on the exact same origin to check synchronization.

`npm test` enforces **100% lines, branches, functions, and statements per application file**, including components, hooks, storage, and domain logic. Latest local run: **211 tests across 19 files passed; 100% line and branch coverage** (also 100% statements and functions). Only `src/main.tsx` is excluded: it only mounts the React root, which is checked in the browser. Tests use concrete expected values, fake clock/randomness/browser storage boundaries, and real components and reducers. See [verification evidence](docs/verification.md) for the checks performed and their limits.

## Architecture and design notes

**Stack:** React, TypeScript, Vite, Vitest, and plain CSS. React and React DOM are the only runtime dependencies. Testing Library and jsdom are development-only tools. There is no UI kit, chart library, router, state library, or backend.

```text
ExpenseForm → domain validation → reducer → useExpenses → localStorage
                                      ↓
                           selected month’s records
                                      ↓
                         derived totals, chart, budget
```

- `src/domain/` contains pure money parsing, date validation, month selection, totals, budgeting, and the isolated scenario. Local dates remain `YYYY-MM-DD` strings, avoiding UTC date shifts.
- `src/storage/` owns the `expense-tracker:v1` schema, sanitization, backups, read/write failures, and browser events. A future backend could replace this boundary without changing the calculations.
- `src/state/` contains the pure reducer, lazy-loading persistence hook, and local-date clock hook. Initialization reads stored data before any save effect, including under React StrictMode.
- `src/components/` contains focused, accessible UI components; `App.tsx` composes them and owns month/filter/Undo state. `src/styles.css` holds the visual system and responsive rules.
- `tests/` mirrors the source structure and includes complete user-flow integration tests.

Money is stored as integer minor units: `150000` means USD 1,500. Parsing builds integers from decimal strings, never `parseFloat(value) * 100`. Display division and percentages never feed back into totals. Limits of 999,999,999.99 per amount and 10,000 records keep every possible aggregate below JavaScript’s safe-integer boundary. Totals are never stored.

The single currency is defined by `CURRENCY` in `src/config.ts`. Changing it changes labels only; it does not convert existing records.

## Storage and limitations

- Data is per browser profile, device, and origin. There is no account, cloud/device sync, export, bank connection, or multi-currency conversion.
- Tabs on the same origin synchronize snapshots with **last-write-wins**. Truly simultaneous edits can replace one another; this is not a transactional multi-user store.
- Clearing site data deletes expenses and settings. Private browsing may discard data when closed. Storage is not encrypted by the app.
- A malformed or unsupported payload is backed up under `expense-tracker:v1:backup` before recovery when storage permits. A later recovery can replace that backup. If storage is blocked or full, the banner explains that in-memory changes may be lost on closing/reloading.
- Seven categories are fixed. There is no edit action yet; delete and re-add to correct a record.
- The monthly budget is one shared limit applied to every month, not separate historical budgets. Future-dated records count in their dated month. The daily allowance is arithmetic on entered data, not a forecast.
- Modern browsers with native `<dialog>` support are required; older browsers have not been tested. Expense ids use `crypto.randomUUID` when available, with a timestamp/random fallback. Use localhost for development and HTTPS for deployment.

**No runtime AI or external API calls.** Development was AI-assisted. The app makes no application-data network requests and loads no remote fonts, scripts, images, analytics, or services. A browser fetches the static HTML, JavaScript, CSS, and icon from the same origin. Once loaded, recording expenses, calculations, and local persistence work without a network connection. **Offline reload is not supported:** there is no service worker or offline installation, and cached files are not guaranteed. A locally running preview remains usable without internet access.

## Deployment

The production build uses Vite `base: './'`, so static assets resolve from the deployed path. Any static HTTPS host can serve `dist/`. `.openai/hosting.json` configures this project’s Sites deployment as static-only.

Sites deployment succeeded for application revision `330260a`. The link above intentionally has owner-only access, as requested. It is not an anonymous judge-facing demo; reviewers without owner access can run the README commands locally. No anonymous public-browser verification is claimed.

Serve the build through `npm run build && npm run preview` or an HTTPS static host. Double-clicking `dist/index.html` is not supported because browsers restrict ES modules on `file://`. No single-file plugin or service worker is included.

## Roadmap

- Edit existing expenses.
- Export/import a validated backup.
- Separate budgets for individual months.

These are intentionally not implemented.
