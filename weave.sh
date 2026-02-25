#!/bin/bash
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
HEADLESS=""
if [[ "${1:-}" == "--ref" ]]; then
  if [[ -z "${2:-}" ]]; then echo "error: --ref requires a branch name" >&2; exit 1; fi
  HEADLESS="$2"; shift 2
  if ! git rev-parse --verify "$HEADLESS" &>/dev/null; then echo "error: branch '$HEADLESS' does not exist" >&2; exit 1; fi
fi
if [[ -n "$HEADLESS" ]]; then
  CURRENT="$HEADLESS"
  if [[ $# -gt 0 ]]; then TARGETS=("$@")
  elif git cat-file -e "$HEADLESS:.weave" 2>/dev/null; then
    mapfile -t TARGETS < <(git cat-file -p "$HEADLESS:.weave" | grep -v '^\s*#' | grep -v '^\s*$')
  else echo "error: no arguments and no .weave file on branch '$HEADLESS'" >&2; exit 1; fi
else
  CURRENT=$(git branch --show-current)
  if [[ $# -gt 0 ]]; then TARGETS=("$@")
  elif [[ -f "$ROOT/.weave" ]]; then
    mapfile -t TARGETS < <(grep -v '^\s*#' "$ROOT/.weave" | grep -v '^\s*$')
  else echo "error: no arguments and no .weave file on branch '$CURRENT'" >&2; exit 1; fi
fi
[[ ${#TARGETS[@]} -eq 0 ]] && { echo "error: no source branches specified" >&2; exit 1; }
for branch in "${TARGETS[@]}"; do
  [[ "$branch" == "$CURRENT" ]] && { echo "skip: refusing to merge '$branch' into itself"; continue; }
  git rev-parse --verify "$branch" &>/dev/null || { echo "error: branch '$branch' does not exist" >&2; exit 1; }
  branch_tip=$(git rev-parse "$branch")
  current_tip=$(git rev-parse "$CURRENT")
  git merge-base --is-ancestor "$branch_tip" "$current_tip" 2>/dev/null && { echo "skip: '$branch' (${branch_tip:0:7}) already woven in"; continue; }
  if [[ -n "$HEADLESS" ]]; then
    echo "weaving '$branch' into $CURRENT (headless)..."
    tree=$(git rev-parse "$CURRENT^{tree}")
    commit=$(git commit-tree "$tree" -p "$current_tip" -p "$branch_tip" \
      -m "weave: merge $branch into $CURRENT (content unchanged)")
    git update-ref "refs/heads/$CURRENT" "$commit"
  else
    echo "weaving '$branch' into $CURRENT..."
    git merge -s ours --no-edit --allow-unrelated-histories "$branch" \
      -m "weave: merge $branch into $CURRENT (content unchanged)"
  fi
done