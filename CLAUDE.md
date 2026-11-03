@AGENTS.md

## Claude Code Workflow Notes

- Before planning, writing, or reviewing code, load the engineering skill: `.agents/skills/serag-engineering/SKILL.md`.
- **Preferred Delegation Workflow**: The user's preferred workflow is that Claude plans, writes task briefs, and conducts thorough diff/browser reviews, while delegating code implementation to Antigravity (`agy`) via `.agents/skills/agy-delegate` (model `gemini-3.8-flash-high`). When agy is out of quota, delegate to OpenCode with its free models via `.agents/skills/serag-engineering/scripts/opencode-relay.sh` (edit-only: no shell, no web, no `.env`). See `.agents/skills/serag-engineering/references/delegation.md` for the brief template and review checklist.
- **Free review step**: after the gates pass and before committing, run `.agents/skills/serag-engineering/scripts/opencode-review.sh` (read-only free OpenCode review of the diff, see `references/delegation.md`) and `/code-review` on risky changes; Claude verifies every finding before acting on it.
- After implementer execution, Claude installs any new dependencies, runs all quality gates (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`), verifies the UI manually in the browser, and commits.
