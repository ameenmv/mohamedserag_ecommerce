#!/usr/bin/env bash
# Free code review of the current diff by an OpenCode free model: read-only (no edits, no shell,
# no web, no .env), it only reads the repo and reports findings. Claude still decides what to fix.
#
#   .agents/skills/serag-engineering/scripts/opencode-review.sh [base-ref] [relay options]
#
# base-ref defaults to HEAD (staged + unstaged + untracked changes). Pass e.g. origin/main to review
# a whole branch. Default model is opencode/big-pickle; pass --model to override.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(git -C "$here" rev-parse --show-toplevel)"
cd "$root"

base="HEAD"
if [ $# -gt 0 ] && [[ "$1" != --* ]]; then base="$1"; shift; fi

max_bytes=150000
diff="$(git diff "$base" -- . ':!pnpm-lock.yaml' | head -c "$max_bytes")"
untracked="$(git ls-files --others --exclude-standard | grep -v '^\.claude/' || true)"
if [ -z "$diff" ] && [ -z "$untracked" ]; then echo "opencode-review: nothing to review against $base" >&2; exit 0; fi

brief="$(mktemp "${TMPDIR:-/tmp}/opencode-review-brief.XXXXXX")"
cat > "$brief" <<BRIEF
# Task: code review (read-only)
You are a strict senior reviewer for the Serag repo. Do NOT edit anything: only report.
Read .agents/skills/serag-engineering/SKILL.md (golden rules) and section 3 "Review Checklist" of
.agents/skills/serag-engineering/references/delegation.md, then review the diff below against them.
Open the changed files for context when the diff alone is not enough.

Report only real problems, most severe first, each as: file:line, what is wrong, a concrete failure
scenario, and the fix in one sentence. Look for: correctness bugs, RTL/i18n violations (hardcoded
strings, missing ar/en keys, non-logical CSS), accessibility, Nuxt auto-import mistakes, secrets,
perf (client JS size) and dead code. Skip style nits and anything you are not sure about.
If there is nothing real, say "No findings."

Untracked (new) files to read as well:
${untracked:-none}

## Diff against ${base}
\`\`\`diff
${diff}
\`\`\`
BRIEF

OPENCODE_PERMISSION_FILE="$here/opencode-readonly.json" "$here/opencode-relay.sh" --brief "$brief" --read-only "$@" || true
rm -f "$brief"
