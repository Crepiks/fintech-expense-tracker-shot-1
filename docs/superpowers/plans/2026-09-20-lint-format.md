# Lint and formatting implementation plan

> Execute in this task using the executing-plans and verification-before-completion skills.

**Goal:** Add compatible lint and formatting tooling without changing application behavior.

**Architecture:** Oxlint checks TypeScript, React, and Hooks correctness. Prettier owns formatting. Existing TypeScript and Vitest commands remain responsible for type checking and application coverage.

**Stack:** React 19, TypeScript 7, Vite 8, npm, Oxlint, Prettier.

**Requirements:** The task requests lint/fix and format/check commands, appropriate ignores, CI integration, consistent formatting, README instructions, and full verification. Preserve application behavior, dependency versions, and mirrored skill sources.

## Task 1: Tooling and contributor workflow

- [x] Verify clean baseline with `npm ci`, `npm test`, and `npm run build` on the pinned Node runtime.
- [x] Install compatible, exact Oxlint and Prettier development dependencies, updating `package.json` and `package-lock.json`.
- [x] Add `.oxlintrc.json`, `.prettierrc.json`, and `.prettierignore` with generated output and mirrored skills excluded.
- [x] Add `lint`, `lint:fix`, `format`, and `format:check` scripts.
- [x] Add lint and formatting checks to `.github/workflows/checks.yml` and document commands in `README.md`.
- [x] Confirm deliberate lint violations are rejected and formatting drift is reported before applying formatting.
- [x] Run the full coverage suite before committing the tooling changes.

## Task 2: Apply and verify formatting

- [x] Run `npm run lint:fix` and `npm run format`; inspect all non-formatting changes.
- [x] Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
- [x] Verify ignored files remain unchanged with `diff -r .agents/skills .claude/skills`.
- [x] Check formatted source against the original and compare production assets for accidental behavior changes.
- [x] Review the complete branch and commit the formatting separately.

## Review focus

- Dependency installation must succeed without unsupported peer-dependency overrides.
- CI must execute the same commands contributors run locally.
- Generated output, credentials, and imported skills must remain outside formatting.
- React Hooks checks must reject conditional Hooks and missing dependencies.
- Formatting must preserve application behavior and 100% coverage.

## Implementation decisions

- Use Oxlint because the current typescript-eslint release declares TypeScript `<6.1.0`, while this repository uses TypeScript 7. Keep the existing compiler version.
- Configuration and formatting changes are verified through the tools themselves and the existing behavior suite; no application behavior or coverage exclusions are added.
- Continue implementation without a separate plan approval because the task explicitly requests completion in this task.

## Verification results

- Node.js 24.21.0 and the committed npm lockfile: clean install succeeded.
- `npm run lint`, `npm run lint:fix`, `npm run format:check`, and `npm run build`: passed.
- `npm test`: 211 tests in 19 files; 100% statements, branches, functions, and lines before and after formatting.
- Deliberate unused variables, conditional Hooks, missing Hook dependencies, and console output were rejected. Formatting drift was rejected and repaired by Prettier.
- All 47 changed application, test, HTML, CSS, and requirements files match Prettier output of their originals. Production JavaScript differs only in adjacent JSX space literals; CSS differs only in whitespace in `rect()`. Existing locked dependencies are unchanged.
- Both skill directories remain identical. Independent review found no actionable findings.
- Scoped exceptions preserve the initial storage notice, budget input synchronization, and synchronous chart offset calculation; the README documents their exact files and rules.
- Commit order: formatting first, then tooling and documentation, keeping the mechanical changes separate.
