#!/usr/bin/env bash
# Build a throwaway dummy workspace under /tmp, apply the book pack, and run
# deterministic assertions (no LLM). The dummy tree is disposable; the pack
# and this script are the durable artifacts. Provenance: amadeus-dlc/amadeus#643.
set -euo pipefail

SRC=${1:?usage: verify-dummy.sh <framework-repo-root containing .claude>}
PACK_DIR=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d "${TMPDIR:-/tmp}/book-pack-dummy.XXXXXX")
echo "dummy workspace: $TMP"

cp -R "$SRC/.claude" "$TMP/.claude"
# Strip machine-local runtime that may ride along from a live checkout.
rm -rf "$TMP/.claude/worktrees" "$TMP/.claude/settings.local.json"

"$PACK_DIR/scripts/apply-pack.sh" "$TMP"
CL="$TMP/.claude"

echo "--- A. graph shape ---"
python3 - "$CL/tools/data/stage-graph.json" <<'PY'
import json, sys
graph = json.load(open(sys.argv[1]))
by = {s["slug"]: s for s in graph}
def num(slug):
    return tuple(map(int, by[slug]["number"].split(".")))
assert len(graph) == 35, f"expected 35 stages, got {len(graph)}"
assert num("book-structure-design") < num("units-generation"), "structure must precede units"
assert by["application-design"]["number"] == "2.9", by["application-design"]["number"]
assert by["chapter-drafting"]["for_each"] == "unit-of-work"
assert by["chapter-drafting"]["workspace_requires"] is True
assert num("units-generation") < num("chapter-drafting") < num("manuscript-review")
in_number_order = [s["slug"] for s in sorted(graph, key=lambda s: tuple(map(int, s["number"].split("."))))]
assert [s["slug"] for s in graph] == in_number_order, "array order must equal number order"
print("A. graph shape OK (35 stages, ordering pinned)")
PY

echo "--- B. grid EXECUTE set ---"
python3 - "$CL/tools/data/scope-grid.json" <<'PY'
import json, sys
grid = json.load(open(sys.argv[1]))
book = grid["book"]["stages"]
expect = {
    "workspace-scaffold", "workspace-detection", "state-init",
    "intent-capture", "scope-definition", "requirements-analysis",
    "book-structure-design", "units-generation",
    "chapter-drafting", "manuscript-review",
}
got = {slug for slug, action in book.items() if action == "EXECUTE"}
assert got == expect, f"EXECUTE mismatch: extra={sorted(got-expect)} missing={sorted(expect-got)}"
assert len(book) == 35, f"grid row must cover all 35 stages, got {len(book)}"
print("B. grid EXECUTE set OK (10/35)")
PY

echo "--- C. validate-scope ---"
bun "$CL/tools/amadeus-graph.ts" validate-scope book
echo "C. validate-scope OK (exit 0; advisories above, if any)"

echo "--- D. runtime walk order ---"
bun -e '
const lib = await import("'"$CL"'/tools/amadeus-lib.ts");
const expected = [
  "workspace-detection", "state-init", "intent-capture", "scope-definition",
  "requirements-analysis", "book-structure-design", "units-generation",
  "chapter-drafting", "manuscript-review",
];
const walked = [];
let cur = "workspace-scaffold";
for (;;) {
  const next = lib.nextInScopeStage(cur, "book");
  if (next === null) break;
  walked.push(next.slug);
  cur = next.slug;
}
if (JSON.stringify(walked) !== JSON.stringify(expected)) {
  console.error("walk mismatch:\nexpected", expected, "\ngot     ", walked);
  process.exit(1);
}
console.log("D. runtime walk order OK:", ["workspace-scaffold", ...walked].join(" -> "));
'

echo "--- E. bolt_dag fixture parse ---"
bun -e '
const lib = await import("'"$CL"'/tools/amadeus-lib.ts");
const fixture = [
  "```yaml",
  "units:",
  "  - name: ch01-intro",
  "    depends_on: []",
  "  - name: ch02-core",
  "    depends_on: [ch01-intro]",
  "  - name: ch03-advanced",
  "    depends_on: [ch02-core]",
  "  - name: appendix-a",
  "    depends_on: []",
  "```",
].join("\n");
const parsed = lib.parseBoltDag(fixture);
if (!parsed.ok) { console.error("parseBoltDag failed:", parsed.reason, parsed.detail); process.exit(1); }
if (parsed.units.length !== 4) { console.error("expected 4 units, got", parsed.units.length); process.exit(1); }
if (parsed.batches.length !== 3) { console.error("expected 3 batches, got", parsed.batches.length); process.exit(1); }
const roots = parsed.batches[0];
if (!(roots.includes("ch01-intro") && roots.includes("appendix-a"))) {
  console.error("batch 1 must hold both roots, got", roots); process.exit(1);
}
console.log("E. bolt_dag fixture OK (4 chapter units -> 3 batches)");
'

echo "--- F. skeleton stance ---"
bun -e '
const lib = await import("'"$CL"'/tools/amadeus-lib.ts");
if (lib.SKELETON_ON_SCOPES.has("book")) {
  console.error("book unexpectedly in SKELETON_ON_SCOPES — scope prose assumes stance=on is required");
  process.exit(1);
}
console.log("F. skeleton stance OK (book not in SKELETON_ON_SCOPES; pilot uses explicit stance=on)");
'

echo ""
echo "ALL CHECKS PASSED — dummy at $TMP (disposable)"
