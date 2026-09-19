EXPENSE TRACKER - IMPLEMENTATION PLAN
React web app, trial hackathon case

============================================================
0. GROUND RULES
============================================================
- No backend, no AI, no external APIs. Data lives in localStorage.
- Single currency, no conversion. One CURRENCY constant in config.
- Totals are never stored. They are always derived from records.
- Required journey first. Optional features only after it works.
- Stack: Vite + React + TypeScript, Vitest, plain CSS.
  No UI kit, no chart library, no router, no state library.

============================================================
1. SCAFFOLD (0:00 - 0:10)
============================================================
Commands:
  npm create vite@latest expense-tracker -- --template react-ts
  cd expense-tracker && npm install
  npm i -D vitest
  add to package.json scripts:  "test": "vitest run"

vite.config.ts:
  set base: './'  so the build works from any path or host.

Folders:
  src/domain/      money.ts validation.ts calc.ts categories.ts
                   selfTest.ts  + *.test.ts
  src/storage/     storage.ts
  src/state/       useExpenses.ts
  src/components/  ExpenseForm MonthSwitcher ExpenseList Totals
                   EmptyState UndoToast JudgeMode CategoryDonut
                   BudgetCard
  src/App.tsx  src/main.tsx  src/styles.css

Also now: git init, README skeleton (headings only), first commit.
Done when: dev server runs and shows a blank App.

============================================================
2. DOMAIN LAYER (0:10 - 0:30)  pure TypeScript, no React
============================================================
2.1 categories.ts
  export const CATEGORIES = ['Food','Transportation','Housing',
    'Study','Fun','Health','Other'] as const
  export type Category = typeof CATEGORIES[number]
  One color per category (used by the donut later).

2.2 Types
  type Expense = {
    id: string            // crypto.randomUUID()
    amountMinor: number   // integer. 150000 = 1,500.00
    category: Category
    date: string          // 'YYYY-MM-DD', always a string
    description?: string
    createdAt: number
  }
  type StoredData = {
    version: 1
    expenses: Expense[]
    settings: { monthlyBudgetMinor: number | null }
  }

2.3 money.ts
  parseAmount(input): {ok:true, minor} | {ok:false, error}
  Algorithm:
    1. s = input.trim(), remove all whitespace incl. \u00A0
    2. empty              -> "Enter an amount."
    3. starts with "-"    -> "Amount must be greater than 0."
    4. if s matches ^\d{1,3}(,\d{3})+(\.\d+)?$
         it is thousands-grouped: strip the commas
       else replace a single "," with "."
    5. not ^\d+(\.\d+)?$  -> "Use digits only, e.g. 1500 or
                              1500.50."
    6. more than 2 decimals -> "Use at most two decimal places."
    7. [int, frac=''] = s.split('.')
       minor = Number(int) * 100 + Number(frac.padEnd(2,'0'))
       (string padding, never parseFloat(x) * 100)
    8. minor === 0        -> "Amount must be greater than 0."
    9. minor > MAX        -> "Amount is too large."
  formatAmount(minor): Intl.NumberFormat('en-US',
    {minimumFractionDigits:0, maximumFractionDigits:2})
    applied to minor / 100. Division is for display only.

2.4 validation.ts
  validateExpense(draft) -> { ok, errors: {amount?, category?,
                                           date?} }
  - amount: result of parseAmount
  - category missing or not in CATEGORIES -> "Choose a category."
  - date missing or not ^\d{4}-\d{2}-\d{2}$ or not a real date
                                          -> "Pick a date."
  - description: optional, trim, cap at 200 chars
  - future date: not an error. Return a separate warning flag.

2.5 calc.ts
  monthKey(date)                 -> date.slice(0, 7)   '2026-09'
  todayLocal()                   -> build 'YYYY-MM-DD' from
                                    getFullYear/getMonth/getDate
                                    (never toISOString)
  expensesForMonth(list, month)  -> filter by monthKey, sort by
                                    date desc, then createdAt desc
  computeTotals(list) -> { totalMinor, byCategory, invariantOk }
    totalMinor  = sum over all records
    byCategory  = grouped sums
    invariantOk = sum(byCategory values) === totalMinor

2.6 Tests (Vitest)
  money:  "1500" "1 500" "1,500" "1500,50" "1500.5" ok
          "" "0" "-5" "abc" "1e5" "10.555" rejected with the
          right message
  calc:   section 6 scenario:
            Food 1500 + Transportation 600 + Food 900
              -> total 3000, Food 2400, Transportation 600
            delete Food 900
              -> total 2100, Food 1500, Transportation 600
          expense in another month does not affect the totals
          empty list -> total 0, invariantOk true
Done when: npm test is green.

============================================================
3. STORAGE + STATE (0:30 - 0:45)
============================================================
3.1 storage.ts   key: 'expense-tracker:v1'
  load(): StoredData
    - missing key -> empty default
    - try JSON.parse, check version === 1, expenses is an array,
      each item has valid id / integer amountMinor > 0 /
      known category / valid date. Drop invalid items.
    - on parse failure: copy raw string to key + ':backup',
      return empty default plus a "recovered" flag for a notice
  save(data): try setItem, catch quota error -> return false so
    the UI can show "Could not save. Storage is full."
  subscribe(cb): window 'storage' listener for our key, parse
    with the same checks, call cb(data). Returns unsubscribe.

3.2 useExpenses.ts
  useReducer with a LAZY initializer that calls load().
  (Do not start empty and load in an effect: a save-on-mount
   effect would overwrite real data, and StrictMode runs it
   twice.)
  Actions: add(expense)  remove(id)  restore(expense)
           replaceAll(data)  setBudget(minor | null)
  Persist: useEffect(() => save(state), [state])
  Tab sync: subscribe -> dispatch replaceAll. Skip if the
    incoming raw string equals the last string we saved.
  Hook returns: { expenses, settings, add, remove, restore,
                  setBudget, storageNotice }
Done when: add a record from the console/UI stub, refresh,
  it is still there.

============================================================
4. CORE UI - REQUIRED JOURNEY (0:45 - 1:10)
============================================================
App.tsx
  state: selectedMonth (default monthKey(todayLocal())),
         categoryFilter (null), lastDeleted (null)
  monthList = useMemo(expensesForMonth(expenses, selectedMonth))
  totals    = useMemo(computeTotals(monthList))
  The list and the totals MUST use the same monthList.

ExpenseForm
  - amount: text input, inputMode="decimal"
  - category: select with empty first option
  - date: input type="date", default todayLocal()
  - description: optional text
  - on submit: validateExpense. Errors render under each field,
    aria-live="polite", field gets aria-invalid.
  - success: add(), clear amount + description, keep category
    and date, focus back to amount.
  - if the saved date is outside selectedMonth, show a hint:
    "Saved to October 2026" with a link to switch month.

MonthSwitcher
  Prev / next buttons + label "September 2026".
  Do not use input type="month" (plain text box in desktop
  Firefox and Safari).

ExpenseList
  Rows: date, category, description, amount, delete button
  (aria-label "Delete expense"). Applies categoryFilter.

Totals
  Overall total, then one row per category with amount and
  percent (percent rounded for display only).
  Badge: "Categories = Total" with a check when invariantOk.

EmptyState
  "No expenses in September 2026 yet." Totals show 0.

Done when: the full section 6 scenario works by hand and
  survives refresh.  -> COMMIT AND DEPLOY HERE.

============================================================
5. RELIABILITY POLISH (1:10 - 1:20)
============================================================
UndoToast
  On delete: remove(id) persists immediately, store the record
  in lastDeleted, start a 5 s timer. "Undo" calls restore()
  with the same record and id. A new delete replaces the
  previous one. Clear the timer on unmount.
Storage notice banner if load() recovered from corrupt data or
  save() failed.
Verify tab sync with two tabs open.

============================================================
6. JUDGE MODE (1:20 - 1:35)
============================================================
selfTest.ts  runSelfTest() -> Array<{label, expected, actual,
                                     pass}>
  Works on an in-memory array with the REAL reducer and
  computeTotals. Never touches user data or localStorage.
  Steps: add Food 1500, Transportation 600, Food 900 (same
  month) -> check 3000 / 2400 / 600 and invariantOk.
  Remove the 900 -> check 2100 / 1500 / 600 and invariantOk.
JudgeMode component
  Button in the footer: "Run validation scenario".
  Modal with an expected-vs-actual table and pass marks.

============================================================
7. DONUT CHART (1:35 - 1:55)
============================================================
CategoryDonut, pure SVG, viewBox 0 0 42 42
  One <circle> per category with total > 0:
    r = 15.915 (circumference = 100), fill none,
    stroke = category color, stroke-width 6
    stroke-dasharray  = `${pct} ${100 - pct}`
    stroke-dashoffset = 25 - cumulativePctBefore
  Empty month: a single grey ring.
  Center text: overall total.
  Legend with amounts. Click a slice or legend row to toggle
  categoryFilter. Show a "Clear filter" chip when active.
  Do not rely on color alone: legend has names and amounts.

============================================================
8. BUDGET CARD (1:55 - 2:05)
============================================================
settings.monthlyBudgetMinor, edited through the same
  parseAmount. Empty input clears the budget.
Shows: budget, spent, remaining, progress bar.
Current month only:
  daysLeft   = daysInMonth - today.getDate() + 1
  safePerDay = Math.floor(remaining / daysLeft)
  "Safe to spend today: 2,300"
Over budget: red, "Over by X". Past months: budget vs spent.
Stipend-day countdown is a stretch goal, skip unless ahead.

============================================================
9. README + FINAL PASS (2:05 - 2:15)
============================================================
README sections:
  1. What it is (two sentences)
  2. Launch: npm install, npm run dev, npm test, npm run build
     + link to the deployed version
  3. Implemented features (required, then optional)
  4. How to verify: "Run validation scenario" button
  5. Limitations: data is per browser and per device, no sync,
     no accounts, single currency, clearing site data deletes
     records, fixed category list, no edit yet.
  6. Design notes: integer money, derived totals, isolated
     storage layer that a REST backend could replace.
  7. Statement: no AI and no external APIs at runtime.

Final manual check:
  [ ] fresh clone: npm install && npm run dev works
  [ ] section 6 scenario by hand, numbers match
  [ ] refresh after add and after delete
  [ ] switch month and back, totals follow
  [ ] expense dated in another month does not change totals
  [ ] inputs: 0, -5, abc, 1e5, 10.555, empty form
  [ ] empty month renders cleanly
  [ ] corrupt the localStorage value by hand, reload
  [ ] two tabs stay in sync
  [ ] keyboard-only pass through the form
  [ ] narrow window (phone width)
  [ ] Judge mode all green
  [ ] redeploy, open the public link in a private window

============================================================
10. CUT LINE AND TEAM SPLIT
============================================================
If behind: drop step 8 first, then step 7. Never drop step 9.
Steps 1-5 are the scored 90 points. Step 6 makes them visible.

With 2-3 people:
  A: steps 2, 3, then 6
  B: step 4 against mock data, then 5
  C: styles, deploy, README, then 7 and 8

============================================================
11. GOTCHAS
============================================================
- new Date('2026-09-01') parses as UTC. Keep dates as strings.
- Never multiply a float by 100. Build minor units from strings.
- Percentages are display only. Never sum them.
- Lazy reducer init, or the mount effect wipes saved data.
- crypto.randomUUID needs localhost or https. Both are fine
  here.
- base: './' in vite.config, or the deployed page is blank.