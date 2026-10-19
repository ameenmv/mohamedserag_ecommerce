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

has_out=false
for arg in "${args[@]}"; do
  case "$arg" in --out-dir|--out-dir=*) has_out=true ;; esac
done
if [ "$has_out" = false ]; then
  out_dir="$(mktemp -d "${TMPDIR:-/tmp}/opencode-relay.XXXXXX")"
  args+=(--out-dir "$out_dir")
fi

set +e
node "$root/.agents/skills/opencode-delegate/scripts/relay.mjs" --no-auto --pure "${args[@]}"
code=$?
set -e

# Free models sometimes stop mid-run with an empty step; the relay still says "completed".
# Treat a run that ends without a final report as failed so the orchestrator re-dispatches it.
if [ "$code" -eq 0 ] && [ "$has_out" = false ] && [ -f "$out_dir/result.json" ]; then
  if node -e 'const r=require(process.argv[1]); process.exit((r.finalMessage ?? "").trim() ? 0 : 1)' "$out_dir/result.json"; then
    exit 0
  fi
  echo "opencode-relay: the model stopped without a final report (likely a free-tier limit); treat this run as failed and re-dispatch." >&2
  exit 3
fi
exit "$code"
