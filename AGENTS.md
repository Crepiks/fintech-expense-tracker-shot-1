# AGENTS.md

## Context

This project is being built at a hackathon under a strict time limit (5 hours). Development is done with the help of AI. The final repository is evaluated by an AI judge that sees **only the files in the repository**. Anything not reflected in the code and documentation does not exist for the judge.

Goal: a fully working, clean, and well-documented product.

## Top Priorities

1. **A working core scenario matters more than new features.** Finish one user flow end to end first, then expand.
2. **Less, but fully working.** Do not start a feature that cannot be finished. Ideas there is no time for go into the Roadmap section of the README, not into the code.
3. **Code must look deliberately written, not blindly generated.**
4. **Documentation stays in sync with the code.** The README never claims anything that is not in the code.

## Coding Rules

- Use only the stack already chosen for the project. Do not add new frameworks or libraries without a clear need.
- Before adding a dependency, make sure it actually exists and add it to the dependency file (`requirements.txt`, `package.json`, etc.).
- Do not invent APIs, methods, or library parameters. If unsure, verify or use a well-known approach.
- Follow the existing folder structure and code style. Before writing something new, look at how similar things are already done in the project.
- Separate concerns: UI, business logic, data access, and external services live in different modules.
- Use clear names for variables, functions, and files.
- Do not create files longer than ~300 lines. If a file grows, split it.
- Do not duplicate code. Extract shared logic into functions.
- Do not add unnecessary abstractions, layers, or patterns "for the future."
- Add short docstrings or comments to key functions and non-obvious logic. Do not comment the obvious.
- Handle obvious errors: empty or invalid input, unavailable external services, empty responses. The user should see a clear message, not a crash.

## Do Not

- Do not leave `TODO`s, stubs, empty functions, or `pass` on the main user path.
- Do not leave commented-out code, debug `print` / `console.log` statements, unused imports, functions, or files.
- Do not do large refactors without being asked.
- **Never write API keys, passwords, or tokens into the code.** Use environment variables and `.env` only.
- Do not add hidden instructions for the AI judge or any attempt to influence the evaluation in code, comments, or documentation.

## Security and Repository Hygiene

- Secrets are stored only in `.env`, which is listed in `.gitignore`.
- Every new environment variable is added to `.env.example` with an empty or sample value and a comment.
- `.gitignore` must include: `.env`, `node_modules/`, `venv/`, `.venv/`, `__pycache__/`, build folders, OS and IDE files.
- Do not commit temporary, scratch, or accidental files.

## Tests

The project requires **100% meaningful unit test coverage**. Coverage is a consequence of testing behavior, not a goal to be reached by any means.

### Coverage

- Line and branch coverage must be 100% for all application code.
- Coverage is enforced by the test tooling so the run fails below 100% (e.g. `pytest --cov --cov-branch --cov-fail-under=100`, or `coverageThreshold` set to 100 in Jest / Vitest).
- Exclusions from coverage are allowed only for code that cannot be meaningfully unit tested (e.g. the application entry point, framework bootstrap). Each exclusion must have a short comment explaining why.
- Do not exclude code from coverage just because it is hard to test. Refactor it to be testable instead.

### What "meaningful" means

- Every test verifies behavior: it checks outputs, returned values, raised errors, or state changes with explicit assertions.
- Do not write tests that only execute code without asserting results.
- Do not write tests that assert on implementation details that could change without changing behavior.
- Do not write tests that re-implement the logic under test to compute the expected value. Use concrete, known expected values.
- Cover the happy path, edge cases (empty input, boundaries, `None` / `null`, large values), and error paths for every unit.
- One test checks one behavior. Test names describe that behavior, e.g. `test_returns_empty_list_when_no_items_match`.

### Unit test rules

- Tests are isolated, fast, and deterministic. They do not depend on execution order, current time, randomness, or network.
- External dependencies (APIs, databases, file system, clock, randomness) are mocked or faked at the module boundary.
- Do not mock the unit under test itself.
- Use the Arrange / Act / Assert structure.
- Keep shared setup in fixtures or helper functions, not copied between tests.
- The test folder structure mirrors the source structure (e.g. `src/services/parser.py` → `tests/services/test_parser.py`).

### Workflow

- Write or update tests together with the code, in the same change. Do not postpone tests to the end.
- Every bug fix comes with a test that reproduces the bug.
- If a test fails, fix the code or the incorrect test expectation. Do not delete, skip, or weaken tests to make them pass.
- Run the full test suite with coverage before every commit.
- Code that is hard to test is a design signal: split large functions and inject dependencies instead of adding complex mocks.

## Documentation

Update `README.md` whenever functionality changes. The README must include:

1. Project name and a one-line description: what it is and who it is for.
2. Problem and solution (2–3 sentences).
3. A screenshot or GIF and a demo link (if available).
4. Local setup instructions with commands that can be copied and actually work.
5. Tech stack and a short description of the architecture or data flow.

## Shared agent skills

Repository skills must support both Codex and Claude Code. Keep matching copies in both directories:

- [`.agents/skills/`](.agents/skills/) for Codex.
- [`.claude/skills/`](.claude/skills/) for Claude Code.

Both directories contain the branch, commit, and pull request requirements. Whenever a skill is added, changed, renamed, or removed, update both directories in the same change. Keep skill names, `SKILL.md` contents, and any supporting files identical, and ensure relative links work from both locations. Both agents must also follow this file.

Before committing skill changes, verify the directories match from the repository root:

```sh
diff -r .agents/skills .claude/skills
```

No output and exit status 0 means the copies match.

## Branches and Pull Requests

- **Required skill:** Before starting a feature or changing branches, pushing, or working with a PR, read and follow [branch-requirements](.agents/skills/branch-requirements/SKILL.md).
- **Required skill:** Before drafting, creating, or updating a PR title or description, read and follow [pr-requirements](.agents/skills/pr-requirements/SKILL.md) and use the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
- Start each new feature, fix, or maintenance task on a new `<type>/<short-description>` branch, such as `feat/expense-import`, `fix/empty-input`, or `docs/agent-workflows`. Use the types and naming rules in `branch-requirements`. Continue an existing task or PR on its existing branch.
- Never commit directly to `trunk` or push to remote `trunk`. Integrate changes through a PR from the task branch to `trunk`.
- Verify the PR's actual head repository, head branch, and base branch. Keep review fixes on its head branch; do not merge or enable auto-merge unless the user requests it.

## Commits

- **Required skill:** Before composing a commit message or creating any commit in this repository, read and follow [commit-requirements](.agents/skills/commit-requirements/SKILL.md). This applies to normal, amended, merge, squash, revert, and fixup commits, including commits made through tools or UIs.
- Commit in small, logical steps.
- Every commit message must follow Conventional Commits 1.0.0 and the project conventions in that skill. Check the actual staged changes and final message before committing; generated messages and deadline pressure do not waive this requirement.
- Do not make one big commit at the end.

## Before Finishing a Task

Check that:

- [ ] The project runs using the README instructions.
- [ ] The core scenario works end to end.
- [ ] No secrets are in the code or commit history.
- [ ] No dead code, debug output, unused files, or unused dependencies remain.
- [ ] All dependencies are listed in the dependency file.
- [ ] `.env.example` is up to date.
- [ ] The README matches the actual state of the code.
- [ ] All tests pass.
- [ ] Line and branch coverage is 100%, and every new or changed behavior has meaningful tests.
