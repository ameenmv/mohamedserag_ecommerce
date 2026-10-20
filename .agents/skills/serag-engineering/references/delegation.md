# AI Delegation & Review Guide

This document describes the multi-agent workflow used in the Serag repository, the structure of delegation briefs, and the strict review checklist built from real mistakes caught during Phase 1.

---

## 1. The Delegation Model

In this repository, engineering work is split between two distinct agent roles:

```text
┌────────────────────────────────────────────────────────┐
│               ORCHESTRATOR (Claude Code)               │
│                                                        │
│  - Plans tasks and defines requirements (tasks.md)     │
│  - Writes detailed, bounded delegation briefs          │
│  - Dispatches tasks to Antigravity CLI (agy)           │
│  - Installs new npm dependencies (if required)         │
│  - Executes all quality gates (lint, typecheck, tests) │
│  - Inspects full git diff and tests UI in browser      │
│  - Commits verified code with clear task references    │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ dispatches brief via agy-delegate
                            │ (no shell execution, no commit)
                            ▼
┌────────────────────────────────────────────────────────┐
│            IMPLEMENTER (Antigravity CLI / agy)         │
│               Model: gemini-3.8-flash-high             │
│                                                        │
│  - Reads workspace files and analyzes existing patterns│
│  - Implements the brief strictly within named files    │
│  - Writes clean, typed code without running commands   │
│  - Returns a structured completion report (result.json)│
└────────────────────────────────────────────────────────┘
```

### Second implementer: OpenCode (free models)

When Antigravity is out of quota, the same loop runs through the OpenCode CLI with its free Zen models:

```bash
.agents/skills/serag-engineering/scripts/opencode-relay.sh --brief brief.txt            # default model: opencode/big-pickle
.agents/skills/serag-engineering/scripts/opencode-relay.sh --brief brief.txt --model opencode/nemotron-3-ultra-free
```

- The wrapper calls the `opencode-delegate` relay (`result.json`, never commits) with `--no-auto` and loads `scripts/opencode-noshell.json` through `OPENCODE_CONFIG_CONTENT`, the highest-precedence config, so a project `opencode.json` cannot loosen it.
- That file allows only read, search and edit inside the repo. Bash, web fetch/search, sub-agents, paths outside the repo, `.env` files and `.git/` are denied. Bash is removed from the toolset entirely, so a run never hangs on a prompt.
- Free models come and go and sometimes return a server error. List the current ones with `opencode models | grep -E 'free|big-pickle'` and probe with a tiny read-only brief before a real one. As of 2026-10-19, `big-pickle` and `nemotron-3-ultra-free` work; the others returned errors.
- The briefs, the "no shell commands" rule and Claude's review and gates are exactly the same as for agy.

### Delegation Principles:
- **Implementer does NOT run shell commands**: Antigravity is instructed not to execute terminal commands (such as `pnpm install`, `pnpm test`, or `prisma migrate`).
- **Implementer does NOT commit**: Only the orchestrator reviews the diff, verifies the gates, and creates git commits.
- **Implementer Model**: Currently configured to use `gemini-3.8-flash-high` (after Gemini 4 Argon quota was exhausted during Slice 0).

---

## 2. Delegation Brief Template

When delegating a task to Antigravity via `.agents/skills/agy-delegate`, use this standard brief template:

```markdown
# Task Brief: [Task ID] - [Short Title]

## 1. Goal
[2-3 sentences explaining what this task accomplishes and why]

## 2. Current State
- Existing files relevant to this task: [list files]
- How it currently behaves: [short description]

## 3. Exact Files to Modify / Create
- Modify: `apps/web/app/components/...`
- Create: `apps/web/app/utils/...`
- Create: `apps/web/test/...`

## 4. Constraints & What NOT to Touch
- Do NOT run shell commands.
- Do NOT commit to git.
- Do NOT edit generated files in `apps/web/app/components/ui/`.
- Do NOT modify `apps/api/prisma/schema.prisma` without instruction.
- Every new user-facing string must be added to BOTH `ar.json` and `en.json`.
- Use logical CSS properties (`ms-`, `pe-`, `start-`, `end-`) for RTL support.
- Follow the component auto-import naming rule (match directory hierarchy).

## 5. Acceptance Criteria
1. [Criterion 1]
2. [Criterion 2]
3. Unit tests added under `...` covering [edge cases].
4. `i18n-messages.test.ts` passes with zero key discrepancies.

## 6. Report Contract
In your final response:
1. List all created or modified files with a one-line summary each.
2. Note any design decisions or assumptions made during implementation.
3. Confirm that no shell commands were run and no files outside the brief were touched.
```

---

## 3. Review Checklist (Real Bugs Caught So Far)

The orchestrator must verify this checklist on every diff produced by an implementer before accepting the work:

### 1. Component Auto-Import Naming Matches Template Tags
- **The Defect**: An implementer placed a file in `components/admin/dashboard/` and named it `AdminWelcomeHeader.vue`. Nuxt registered it as `<AdminDashboardAdminWelcomeHeader>`, but the template wrote `<AdminDashboardWelcomeHeader>`, throwing a Vue resolution error.
- **The Check**: Verify that every component tag in templates matches Nuxt's auto-import registration name. When in nested subfolders, the filename must match the full directory path prefix (e.g. `AdminDashboardWelcomeHeader.vue`).

### 2. No Circular Imports Between Composables
- **The Defect**: `useAdminAuth` imported `adminFetch`, which imported `useAdminAuth` to check session state, creating an initialization deadlock and SSR memory leak.
- **The Check**: Ensure dependencies flow unidirectionally: `composables/` → `utils/` → `types/`. Composables must never cyclically import each other.

### 3. No Duplicated Auto-Imports or Re-Exports
- **The Defect**: An implementer added `import { ref, computed } from 'vue'` or `import { useI18n } from 'vue-i18n'` at the top of a file, causing Nuxt build warnings about duplicate imports.
- **The Check**: Verify that Vue primitives (`ref`, `computed`), Nuxt composables (`useI18n`, `navigateTo`), and project composables/utils are NOT explicitly imported.

### 4. No Over-Defensive Fallbacks with Hardcoded Strings
- **The Defect**: Code like `t(key) || 'البريد الإلكتروني'` or `error || 'حدث خطأ'`. If the key is missing or fails, hardcoded strings mask i18n deficiencies and render untranslated text in English mode.
- **The Check**: Ensure fallbacks use translation keys or standard error helpers (e.g. `loginErrorKey(err)`).

### 5. No Duplicated Helpers (Use `@serag/shared`)
- **The Defect**: An implementer wrote an inline helper to format prices as `egp / 100 + ' ج.م'` or an inline regex to sanitize phone numbers.
- **The Check**: Grep for duplicated domain logic. Always import `formatEgpWithUnit`, `egpToPiastres`, `normalizeArabic`, or `normalizePhone` from `@serag/shared`.

### 6. No Unused Returns or Dangling Refs
- **The Defect**: Composables returning reactive variables (`const isFoo = ref(false)`) that are never read by callers or used in templates.
- **The Check**: Verify that every returned ref, function, or computed in a composable has at least one active consumer.

### 7. No Hardcoded Localized Paths
- **The Defect**: Writing `<NuxtLink to="/admin/orders">` or `navigateTo('/admin')` directly. When visiting in English (`/en`), this strips the `/en` prefix and abruptly redirects the user to Arabic.
- **The Check**: Ensure all internal links and router calls use `localePath('/...')`.

### 8. Slot Props Exposed Must Be Wired
- **The Defect**: Wrapping an `<Input>` inside `<FormField>`:
  `<FormField id="email" label="Email" :error="err"><Input /></FormField>`
  without binding the slot props (`id`, `invalid`, `describedBy`). Screen readers lose label association and error announcements.
- **The Check**: Ensure the child input explicitly consumes slot props:
  `<template #default="{ id, invalid, describedBy }"><Input :id="id" :aria-invalid="invalid" :aria-describedby="describedBy" /></template>`.

### 9. Hydration-Safe Form Submissions
- **The Defect**: Leaving login inputs and submit buttons enabled in static SSR HTML, allowing native browser POST/GET submission before Vue hydrates.
- **The Check**: Verify that form inputs and submit buttons are `:disabled="submitting || !hydrated"`.
