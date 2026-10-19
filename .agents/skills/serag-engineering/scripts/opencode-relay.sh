#!/usr/bin/env bash
# Delegates a brief to OpenCode as an edit-only implementer: it can read, search and edit
# files in the repo, but has no shell, no web access, no files outside the repo and no .env.
# Wraps the opencode-delegate relay (result.json, never commits) and passes --no-auto so the
# permission file below is enforced instead of auto-approving everything.
#
#   .agents/skills/serag-engineering/scripts/opencode-relay.sh --brief brief.txt [relay options]
#
# Default model is the free opencode/big-pickle; pass --model to override (free models change,
# list them with `opencode models | grep -E 'free|big-pickle'`).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(git -C "$here" rev-parse --show-toplevel)"

# Inline config has the highest precedence, so a project opencode.json cannot loosen it.
OPENCODE_CONFIG_CONTENT="$(cat "$here/opencode-noshell.json")"
export OPENCODE_CONFIG_CONTENT

args=("$@")
has_model=false
for arg in "${args[@]}"; do
  case "$arg" in --model|--model=*|--lane|--lane=*|--resume-last|--session|--session=*) has_model=true ;; esac
done
if [ "$has_model" = false ]; then
  args+=(--model opencode/big-pickle)
fi

has_cd=false
for arg in "${args[@]}"; do
  case "$arg" in --cd|--cd=*) has_cd=true ;; esac
done
if [ "$has_cd" = false ]; then
  args+=(--cd "$root")
fi

exec node "$root/.agents/skills/opencode-delegate/scripts/relay.mjs" --no-auto --pure "${args[@]}"
