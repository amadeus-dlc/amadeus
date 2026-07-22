#!/usr/bin/env bash
# Apply the book pack to an amadeus workspace (its root contains .claude/).
# Idempotent: safe to re-run. See book-pack/README.md for provenance (#643).
set -euo pipefail

TARGET=${1:?usage: apply-pack.sh <workspace-root containing .claude>}
PACK_DIR=$(cd "$(dirname "$0")/.." && pwd)
CL="$TARGET/.claude"

[ -d "$CL/amadeus-common/stages" ] || { echo "not an amadeus workspace: $CL" >&2; exit 1; }

# 1. New stage files + the units-generation fork (wholesale replacement).
cp "$PACK_DIR/stages/inception/book-structure-design.md" "$CL/amadeus-common/stages/inception/"
cp "$PACK_DIR/stages/inception/units-generation.md"      "$CL/amadeus-common/stages/inception/"
cp "$PACK_DIR/stages/construction/chapter-drafting.md"   "$CL/amadeus-common/stages/construction/"
cp "$PACK_DIR/stages/construction/manuscript-review.md"  "$CL/amadeus-common/stages/construction/"

# 2. Agents and scope metadata.
cp "$PACK_DIR/agents/amadeus-author-agent.md" "$CL/agents/"
cp "$PACK_DIR/agents/amadeus-editor-agent.md" "$CL/agents/"
cp "$PACK_DIR/scopes/amadeus-book.md"         "$CL/scopes/"

# 3. Add `book` to the scopes: frontmatter of the kept (unforked) stages.
#    The scope grid is a pure transpose of stage frontmatter, so membership
#    lives here. Idempotent via the grep guard.
KEPT_STAGES=(
  initialization/workspace-scaffold.md
  initialization/workspace-detection.md
  initialization/state-init.md
  ideation/intent-capture.md
  ideation/scope-definition.md
  inception/requirements-analysis.md
)
for rel in "${KEPT_STAGES[@]}"; do
  p="$CL/amadeus-common/stages/$rel"
  if ! grep -q '^  - book$' "$p"; then
    python3 - "$p" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path).read()
out, n = re.subn(r"(?m)^scopes:\n", "scopes:\n  - book\n", src, count=1)
assert n == 1, f"scopes: block not found in {path}"
open(path, "w").write(out)
PY
    echo "scopes += book: $rel"
  fi
done

# 4. Pre-seed stage numbers so the walk order is correct.
#    Compile bootstraps number+name by slug from the existing JSON, and its
#    own error message sanctions renumbering there. application-design is
#    SKIP in the book scope; parking it at 2.9 frees 2.6 so
#    book-structure-design runs BEFORE units-generation (2.7). The only
#    stage that required application-design was units-generation, and the
#    fork points it at book-structure-design instead.
python3 - "$CL/tools/data/stage-graph.json" <<'PY'
import json, sys
path = sys.argv[1]
graph = json.load(open(path))
slugs = {s["slug"] for s in graph}
for s in graph:
    if s["slug"] == "application-design":
        s["number"] = "2.9"
if "book-structure-design" not in slugs:
    graph.append({"slug": "book-structure-design", "number": "2.6", "name": "Book Structure Design"})
json.dump(graph, open(path, "w"), indent=2)
PY

# 5. Recompile: stage-graph.json + scope-grid.json regenerate from the
#    stage files with the pinned numbers.
bun "$CL/tools/amadeus-graph.ts" compile

echo "book pack applied to $TARGET"
