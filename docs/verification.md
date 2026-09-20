# Verification evidence

## Mobile-first redesign — 20 September 2026

Implemented from the supplied eight-page “Pocket Ledger — Redesign Directions” PDF and the eight desktop/mobile HTML exports. The source files remain external design references; screenshots below show the working application. Work is on `feat/mobile-first-redesign`, based on `origin/trunk` revision `5aad69f`.

## Automated checks

Using the repository's pinned Node.js **24.21.0**:

- `npm ci` completed using the existing lockfile. No runtime or development dependencies were added.
- `npm test`: **611 tests across 44 files**, all passing. Enforced per-file coverage: **100% statements (1,109/1,109), branches (920/920), functions (304/304), and lines (818/818)**.
- `npm run typecheck` and `npm run build` passed. The production bundle is approximately 286.32 kB JavaScript / 87.67 kB gzip and 32.42 kB CSS / 6.90 kB gzip, plus locally bundled fonts.
- The only coverage exclusion remains `src/main.tsx`, which mounts React. Production mounting was checked in the browser. No behavior was excluded or skipped to reach coverage.
- Shared skills remain unchanged and identical in `.agents/skills` and `.claude/skills`.

Tests cover legacy storage recovery, category limits, monthly recurrence and capacity retry, money/date boundaries, CSV quoting and formula escaping, atomic import, command parsing, combined filters, editing, deletion/Undo, fixed-cost forecasts, all view states, keyboard shortcuts, dialogs, and cross-tab updates. Filesystem, clock, UUID, and storage boundaries are deterministic in unit tests.

Independent review identified and led to regression fixes for relative dates when adding to a selected day, stale deleted-record snapshots, future fixed-cost forecast arithmetic, pending-cost reserves in Settings, capacity-blocked recurrence, and calendar navigation across weeks/years. A follow-up review passed 94 targeted tests; its final cross-month week finding was then reproduced and fixed with regression coverage. The week containing September 30 ($10) and October 1 ($20) now shows all seven dates and a $30 total.

Browser testing additionally reproduced native dialog focus moving to Cancel. Quick entry now focuses the note after `showModal`; a regression test models native initial focus. Historical months with a saved limit say “Current month only” instead of incorrectly prompting “Set a budget.”

## Browser checks

Used the Codex in-app browser with the Vite development server at an isolated test origin, `http://127.0.0.1:5185/`. The existing data at port 5173 was left untouched. All screenshot data is synthetic, imported through the real CSV interface; the app does not seed these records into a new user's storage.

- Imported all 29 reference records. September showed **$1,286.40 spent**, **$750 fixed**, **$26.82 variable daily average**, and **$513.60 left** with an $1,800 limit. Saved all seven category caps; reload preserved them.
- Added a $12.50 Food expense, searched with `note:lunch >10`, edited it to $15, deleted it, and used Undo to restore the edited $15 record. Removed the temporary record and confirmed the original 29 entries after reload.
- Checked mobile Calendar, Ledger, Budget and Add at **390×844**; Calendar also at **320×740**. Checked tablet ledger width at **768×1024** and all desktop screens at **1280×960**. No page-width overflow at the checked narrow widths.
- Verified category filtering, selected-day details, editable limits, fixed costs, and month navigation. In desktop week view, September 27 → Next displays the complete September 28–October 4 week. Selecting September 30 changes the month back to September. Year navigation advances to 2027.
- Verified ⌘K opens quick entry with note focus; Escape closes it and restores trigger focus. The desktop dialog fits its content; mobile Add fills the viewport.
- Inspected the screenshots against the PDF/HTML references for typography, blue heatmap, hatch treatment, spacing, sidebar, ledger columns, category bars, chart and mobile navigation.

A separate production smoke test used `npm run preview -- --port 4185` and fresh storage:

1. Loaded the built app and its bundled font assets.
2. Used Ctrl+K and Enter to record `12.50 smoke test #food`; the ledger showed one entry totaling $12.50.
3. Triggered CSV export and observed the selected-month export confirmation. CSV serialization and download lifecycle are independently covered by unit tests.
4. Reloaded; the record remained. Settings' validation scenario reported **10/10 PASS** and left the record unchanged.
5. Production console contained **no warnings or errors**. During development, one earlier HMR-only effect-dependency warning occurred while changing code; it did not recur in the production build.

## Screenshots and design comparison

| Screen | Desktop | Mobile | Comparison |
| --- | --- | --- | --- |
| Calendar | [Desktop](screenshots/desktop.png) | [Mobile](screenshots/mobile.png) | Geist typography, blue spending intensity, fixed-cost hatch, selected-day card, desktop category sidebar, mobile bottom navigation. |
| Ledger | [Desktop](screenshots/ledger.png) | [Mobile](screenshots/ledger-mobile.png) | Search and filter chips, day grouping, desktop summary cards/running balance, simplified mobile rows. |
| Budget | [Desktop](screenshots/budget.png) | [Mobile](screenshots/budget-mobile.png) | Cumulative chart, black forecast panel, per-category limits and pace markers, fixed-cost list. |
| Quick entry | [Command bar](screenshots/command.png) | [Add](screenshots/add-mobile.png) | Editable note, live parsed preview, category/date tokens, real recent entries, full-screen mobile form. |

[Validation scenario](screenshots/validation.png) also uses the redesigned UI.

Intentional differences from the prototypes:

- Live date, real records and calculated figures replace static sample values. Safe allowance includes today: the reference records yield **$46.69/day**, rather than the prototype's $51.36 that excludes today.
- Suggestions use actual recent records, not fabricated frequency/average claims. The command dialog shares mobile entry tokens and the optional manual form.
- Category creation is not implemented: the existing seven-category validation/storage contract is retained. Arbitrary tags would need a category management and migration workflow.
- Limits remain shared between months. Historical per-month budgets would need a versioned budget model and editor.
- Monthly recurring charges are implemented locally and caught up on reopening. There is no background service, cloud synchronization or bank connection.
- Mobile adds a selected-day entry action and CSV access; desktop retains Settings and the original validation scenario. No inert prototype controls were added.

## Limits and delivery

The redesign is delivered through the feature branch and its pull request, not a new hosted deployment. The owner-only Sites demo linked in the README still runs an older revision. No PR merge, deployment, or audience change was performed for this task.

These checks do not claim physical-phone, soft-keyboard, screen-reader, Firefox or independent Safari validation. Browser storage remains last-write-wins across tabs. Recording works after the app has loaded without network, but offline reload/install is not supported. The build remains a static application with no service worker or backend.

Historical verification evidence for the previous design is retained in Git history; the screenshots and results in this document describe this redesign only.
