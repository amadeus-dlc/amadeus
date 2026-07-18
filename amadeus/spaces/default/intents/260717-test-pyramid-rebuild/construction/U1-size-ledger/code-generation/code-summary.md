上流入力(consumes 全数): HANDOFF.md, amadeus-state.md, requirements.md, unit-of-work.md, unit-of-work-story-map.md, business-logic-model.md, business-rules.md, domain-entities.md, frontend-components.md, performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, nfr-design-questions.md, code-generation-plan.md

# Code Generation Summary — U1 サイズ分類台帳

## 実行境界と結果

本成果物は、U1 の承認済み境界「台帳データ + 消費契約の materialize」を実行した正式 record である。application code、test、config、runner、metrics collector、CI は変更していない。

| 項目 | コマンド stdout の結果 |
| --- | --- |
| verdict | `complete` |
| observedRef | `3917a283a953165866170d235d3dc25ad2fd3643` |
| candidateCount | 442 |
| rows | 442 |
| matrix sum | 442 |
| read failures | 0 |
| run 1 SHA-256 | `8b1d084d79bb5a8719ea23c5c36910cbc5aec1d9305194d497b2c55258892f84` |
| run 2 SHA-256 | `8b1d084d79bb5a8719ea23c5c36910cbc5aec1d9305194d497b2c55258892f84` |
| byte-equivalent | `true` |

数値・verdict・各 row は、対象 ref の read-only export に対する測定コマンド stdout からのみ転記した。期待値を測定プログラムへ入力していない。

## tier×size matrix

| key | count |
| --- | ---: |
| `e2e_large` | 2 |
| `e2e_medium` | 63 |
| `e2e_small` | 3 |
| `harness_medium` | 1 |
| `integration_medium` | 138 |
| `integration_small` | 9 |
| `lib_medium` | 1 |
| `smoke_medium` | 14 |
| `unit_large` | 1 |
| `unit_medium` | 162 |
| `unit_small` | 48 |
| **合計** | **442** |

discovered tiers は `e2e / harness / integration / lib / smoke / unit`。`Tier` は開いた集合であり、harness/lib を台帳から除外しない。

## Consumer contract

```text
LedgerRow = {
  file: logical repository-relative path,
  tier: tests-root-relative path の第1階層,
  measured: "small" | "medium" | "large",
  declared: "small" | "medium" | "large" | null,
  signals: readonly string[]
}

SizeLedger = {
  observedRef: commit SHA,
  rows: file の code-unit 昇順に並ぶ readonly LedgerRow[],
  matrix: code-unit 昇順の `${tier}_${measured}` → count
}

LedgerBuildOutcome =
  | complete   { ledger, candidateCount }
  | incomplete { ledger, candidateCount, readFailures[] }
  | fatal      { failure }
```

- size と signals の唯一の分類源は対象 ref の `tests/lib/test-size.ts` にある `classifyTestSize`。
- declared の唯一の抽出源は同ファイルの `parseSizeAnnotation`。
- `file` と `tier` は発見時 logical path から導出し、canonical target は containment/read にだけ使う。
- `incomplete` / `fatal` を `complete` に縮退させない。source 本文、絶対 path、canonical path、runtime error message は record へ含めない。
- 既存 `scripts/metrics-snapshot.ts` の `test_pyramid` collector と key/value が完全一致した。collector 自体の統合・変更は行っていない。

## 完全性・決定性の検証

| 検査 | stdout verdict |
| --- | --- |
| `candidateCount = rows.length + readFailures.length` | `true` |
| `matrix sum = rows.length` | `true` |
| rows の code-unit 順 | `true` |
| matrix key の code-unit 順 | `true` |
| 2回の canonical JSON stdout の byte 比較 | `true` |
| collector key compatibility | `true` |
| collector value compatibility | `true` |
| row field contract | `true` |

## 安全な再現コマンド

次のコマンドは対象 commit を repo 外へ export し、export tree のファイルを書込不可にして2回測定する。cleanup は自身が `mktemp` で作成し、prefix を再検証した path だけを対象にする。

```bash
set -euo pipefail
u1_target_ref='3917a283a953165866170d235d3dc25ad2fd3643'
u1_tmp_root=$(mktemp -d /tmp/amadeus-u1-ledger.XXXXXX)
cleanup_u1() {
  case "$u1_tmp_root" in
    /tmp/amadeus-u1-ledger.*)
      chmod -R u+w "$u1_tmp_root" 2>/dev/null || true
      rm -rf -- "$u1_tmp_root"
      ;;
    *) return 1 ;;
  esac
}
trap cleanup_u1 EXIT

u1_observed_ref=$(git rev-parse "${u1_target_ref}^{commit}")
mkdir -p "$u1_tmp_root/tree" "$u1_tmp_root/evidence"
git archive "$u1_observed_ref" | tar -x -C "$u1_tmp_root/tree"
chmod -R a-w "$u1_tmp_root/tree"

measure_u1() {
  MEASURE_TREE="$u1_tmp_root/tree" MEASURE_REF="$u1_observed_ref" bun - <<'BUN'
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const tree = resolve(process.env.MEASURE_TREE ?? "");
const observedRef = process.env.MEASURE_REF ?? "";
const testsRoot = resolve(tree, "tests");
const canonicalRoot = realpathSync(testsRoot);
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const slash = (value) => value.replaceAll("\\", "/");
const walk = (directory) => readdirSync(directory, { withFileTypes: true })
  .sort((a, b) => compare(a.name, b.name))
  .flatMap((entry) => entry.isDirectory()
    ? walk(join(directory, entry.name))
    : entry.name.endsWith(".test.ts") && (entry.isFile() || entry.isSymbolicLink())
      ? [join(directory, entry.name)]
      : []);

const candidates = walk(testsRoot).map((logicalPath) => {
  const file = slash(relative(tree, logicalPath));
  const testsRelative = slash(relative(testsRoot, logicalPath));
  const segments = testsRelative.split("/");
  if (isAbsolute(file) || !file.startsWith("tests/") || segments.length < 2 ||
      segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("path-rejected");
  }
  const canonicalTarget = realpathSync(logicalPath);
  const fromRoot = relative(canonicalRoot, canonicalTarget);
  if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) ||
      isAbsolute(fromRoot) || !statSync(canonicalTarget).isFile()) {
    throw new Error("path-rejected");
  }
  return { file, tier: segments[0], canonicalTarget };
}).sort((a, b) => compare(a.file, b.file));

if (new Set(candidates.map((item) => item.file)).size !== candidates.length ||
    new Set(candidates.map((item) => item.canonicalTarget)).size !== candidates.length) {
  throw new Error("duplicate-candidate");
}
const classifier = await import(pathToFileURL(resolve(tree, "tests/lib/test-size.ts")).href);
const rows = candidates.map((candidate) => {
  const source = readFileSync(candidate.canonicalTarget, "utf8");
  const measured = classifier.classifyTestSize(source);
  const declared = classifier.parseSizeAnnotation(source);
  return { file: candidate.file, tier: candidate.tier, measured: measured.size,
    declared: declared.declared, signals: [...measured.signals] };
});
const rawMatrix = {};
for (const row of rows) {
  const key = `${row.tier}_${row.measured}`;
  rawMatrix[key] = (rawMatrix[key] ?? 0) + 1;
}
const matrix = Object.fromEntries(Object.entries(rawMatrix).sort(([a], [b]) => compare(a, b)));
const matrixSum = Object.values(matrix).reduce((sum, value) => sum + value, 0);
if (matrixSum !== rows.length) throw new Error("invariant-violated");
console.log(JSON.stringify({ schemaVersion: 1, verdict: "complete",
  candidateCount: candidates.length, observedRef, matrix, readFailures: [], rows }, null, 2));
BUN
}

measure_u1 > "$u1_tmp_root/evidence/run1.stdout.json"
measure_u1 > "$u1_tmp_root/evidence/run2.stdout.json"
cmp -s "$u1_tmp_root/evidence/run1.stdout.json" "$u1_tmp_root/evidence/run2.stdout.json"
shasum -a 256 "$u1_tmp_root/evidence/run1.stdout.json" "$u1_tmp_root/evidence/run2.stdout.json"
cat "$u1_tmp_root/evidence/run1.stdout.json"
```

## 全 ledger rows（canonical command stdout）

次の JSONL は canonical JSON stdout の `rows` を順序を変えず1行ずつ再出力したもの。行番号は説明用でなく、JSON object 1行を台帳の1 row とする。

```jsonl
{"file":"tests/e2e/setup-bin-shim.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/setup-install.test.ts","tier":"e2e","measured":"large","declared":null,"signals":["network","spawn","filesystem"]}
{"file":"tests/e2e/setup-upgrade.test.ts","tier":"e2e","measured":"large","declared":null,"signals":["network","spawn","filesystem"]}
{"file":"tests/e2e/t-acp-kiro-compose-front.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-acp-kiro-journey-workspace.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-acp-kiro-jump.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-acp-kiro-reviewer.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["filesystem","timer"]}
{"file":"tests/e2e/t-acp-kiro-status.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-acp-kiro-utilities.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-exec-codex-compose-front.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-exec-codex-journey-workspace.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-exec-codex-memory-include.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-exec-codex-status.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-ide-kiro-checkpoint.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["filesystem","timer"]}
{"file":"tests/e2e/t-tui-compose-front.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-custom-harness.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-journey-orientation.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-kiro-bugfix-scope.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-kiro-intent-capture.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-kiro-status.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-preflight.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-render-colour.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-render-complete.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-render-statusline.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-statusline.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-t101-memory-lifecycle.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-t139-revision-loop-idempotency.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-t24-stage-jump.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t-tui-t27-depth-override.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-t29-env-scope.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-t50-bugfix-scope.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-t51-poc-scope.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-t58-workshop-scope.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-t73-intent-capture.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-t74-requirements-analysis.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t-tui-workshop.serial.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t01-helpers.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t02.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t03.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t04.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t05.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t06.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t07-audit-fork-merge.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/e2e/t09-halt-and-ask-preservation.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t10-halt-and-ask-discard.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t11-halt-and-ask-retry-correlation.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/e2e/t113.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/e2e/t12-bolt-runtime-graph-fork.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t122-stop-hook-e2e.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t126-emitter-pairing-cofire.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t134-swarm-referee.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t138-scope-exclusion-counts.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/e2e/t52-workflow-state-progression.test.ts","tier":"e2e","measured":"small","declared":null,"signals":[]}
{"file":"tests/e2e/t53.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t54-workflow-audit-completeness.test.ts","tier":"e2e","measured":"small","declared":null,"signals":[]}
{"file":"tests/e2e/t55-workflow-init-then-resume.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/e2e/t56-workflow-forward-jump.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/e2e/t57-workflow-backward-jump.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/e2e/t59-workflow-depth-override.test.ts","tier":"e2e","measured":"small","declared":null,"signals":[]}
{"file":"tests/e2e/t60-construction-worktrees-enterprise.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t61-construction-worktrees-feature.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t62-construction-worktrees-mvp.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t63-construction-worktrees-poc.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t64-construction-worktrees-workshop.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t65-construction-worktrees-bugfix.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t66-construction-worktrees-refactor.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t67-construction-worktrees-security-patch.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/e2e/t92-linter-eslint-roundtrip.test.ts","tier":"e2e","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/harness/kiro-acp-drive.calibration.test.ts","tier":"harness","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/sdk-drive.calibration.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/setup-files-drift.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/setup-install-flow.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/setup-pack-contract.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/setup-resolve-fetch-manifest.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/setup-upgrade-flow.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t-answer-evidence-sensor.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/integration/t-cursor-adapter.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-custom-harness-compile.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-ensure-stage-diary.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/integration/t-eoc1-gate-evidence.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["spawn","filesystem"]}
{"file":"tests/integration/t-journey-workspace.sdk.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t-norm-metrics.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/integration/t-opencode-emit.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t-package-check-root-orphan.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-package-check-source-unreferenced.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-practices-promote-contract.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-release-sync-atomicity.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-scope-change-checkbox-preserve.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/integration/t-sensor-fire-hardening.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-standing-grant.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-team-msg.test.ts","tier":"integration","measured":"medium","declared":"large","signals":["spawn","filesystem"]}
{"file":"tests/integration/t-team-up-codex-resume.test.ts","tier":"integration","measured":"medium","declared":"large","signals":["spawn","filesystem"]}
{"file":"tests/integration/t-team-up-msg-backend.test.ts","tier":"integration","measured":"medium","declared":"large","signals":["spawn","filesystem"]}
{"file":"tests/integration/t-transition-guard-audit.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t-upstream-v2-nofollow-seams.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t-worktree-gc.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t102.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t104.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t105.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t106.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t107-session-skills-readonly.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t110.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t111-session-skills-contract.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t112.serial.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t118.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t12-state-fixture-validation.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t120-classify-roundtrip.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t121-stop-hook-enforce.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t127-single-stage-invariant.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t128-custom-runner.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t130-scope-runners.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/integration/t131-hooks-settings-fire.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t135-invoke-swarm.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t136.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t137.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t141-enterprise-scope-routing.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t143-scope-start-birth.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t145-packaging-parity.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t145-state-lock-concurrency.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t162-per-intent-layout-cli.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t163-reaper-steal-race.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t164-shard-ordering-and-lock-bucket.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t165-intent-birth-p4.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t166-multi-repo-construction.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t171-birth-gate-registry.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t172-migration-audit-trail.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t173-session-switch-restamp.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/integration/t175-space-create-memory-isolation.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t176-new-work-offer-second-intent.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t183-codekb-placement-reverify.sdk.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t185-stage-artifact-guard.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t187-park-conversational.sdk.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t189-compose-dispatch.sdk.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t19.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/integration/t192-compose-front-journey.sdk.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t193-compose-report-journey.sdk.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t195-stop-hook-compose-carveout.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t196-compose-inflight.sdk.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t197-compose-chat-inflight.sdk.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t199-generated-prefix-contract.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t20.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t21.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t211-linter-lint-check.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t212-optional-produces.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t214-engine-error-logged.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t215-docs-only-exemption.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t21b.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t22.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t220-run-tests-totals.integration.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t221-metrics-snapshot.integration.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t222-ci-snapshot-branch.integration.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t222-migration-routing.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t223-release-bot-bypass.integration.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t223-settings-load.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/integration/t224-state-set-failclosed.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t224-upstream-v2-migration-cli.test.ts","tier":"integration","measured":"medium","declared":"large","signals":["spawn","filesystem"]}
{"file":"tests/integration/t225-upstream-v2-migration-preflight.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t226-migration-doctor-heartbeats.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t226-migration-routing-in-process.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t227-codex-migration-walking-skeleton.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t227-project-skill-projection.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/integration/t228-settings-docs-sync.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/integration/t229-coverage-patch-gate-check.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t23.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts","tier":"integration","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/integration/t230-metrics-timeseries.integration.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t231-metrics-retention.integration.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t25.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t26.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t28-integration-test-strategy.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t30-scope-stage-mapping.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t31-help.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/integration/t32-stage-graph-consistency.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t33-hook-concurrency.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t34-stage-protocol-structure.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t35-stage-protocol-recovery.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t36-stage-protocol-governance.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t37-stage-protocol-compliance.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t38-stage-agent-cross-check.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t39-count.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t39.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t40-settings-hook-config.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t41-jump-flag-validation.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t42-state-jumped-fixture.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t43.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t44.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t45-revision-loop.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t45.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/integration/t46-parallel-bolt.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t47-construction-bolts.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t47-failure-injection.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t48-audit-event-emitters.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t48-runtime-graph-end-to-end.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t49-bolt-sensor-failures.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t49.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t51.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t52-drift-meta-validation.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t55-test-suite-drift.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t65.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t66.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t70.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t71-stage-workspace-detection-brownfield.test.ts","tier":"integration","measured":"small","declared":null,"signals":[]}
{"file":"tests/integration/t72-stage-reverse-engineering.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t75.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t76-halt-and-ask-prose-shape.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t78-bolt-worktree-lifecycle.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t88.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/integration/t89.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t90.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t91.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t92.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/integration/t93.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/integration/t95-sensor-fire-hook-feature.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/integration/t96.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t98.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/integration/t99-learnings-gate-flow.test.ts","tier":"integration","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/lib/bun-junit-to-meta.test.ts","tier":"lib","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/smoke/setup-cli-smoke.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/smoke/t-scope-mapping-guard.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t01-file-structure.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t02-hook-executability.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t03-settings-json.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t04-shell-lint.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t05-run-tests-parallel.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["spawn","filesystem","timer"]}
{"file":"tests/smoke/t06-claude-md-paths.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t119-skill-md-line-budget.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t123-skills-spec-conformance.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t130-scope-runners.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/smoke/t148-kiro-file-structure.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t149-opencode-cursor-dist-structure.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/smoke/t86-stage-protocol-section-13.test.ts","tier":"smoke","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/complexity-gate.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/coverage-comment-strip.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/coverage-project-gate.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/gen-coverage-registry.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/setup-applier.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-cli-wiring.test.ts","tier":"unit","measured":"large","declared":null,"signals":["network"]}
{"file":"tests/unit/setup-command.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-fetch-error.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-fetcher.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/setup-fsops-resolve.test.ts","tier":"unit","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/unit/setup-harness-parse.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-harness.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-http.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-installation.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/setup-lazy-build.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/setup-manifest-io.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/setup-manifest.pbt.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-manifest.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-plan-decisions.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-plan.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/setup-reporter.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-resolved-version.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-resolver.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-semver.pbt.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-semver.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-timestamps.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-upgrade.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/setup-verifier.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-version-spec.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/setup-wizard.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t-active-space-includes.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-advance-direction-seam.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t-batch3-orchestrate-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-batch3-orchestrate-spawn.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t-delegate-answer-consume.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-docs-only-exemption-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-graph-dispatch-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t-jump-direction-seam.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t-jump-phase-events-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-learnings-persist-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-memory-seed.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t-norm-metrics.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t-package-unreferenced-source.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-package-write-sweep.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-phase-check-gate-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-phase-progress-rollup-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-practices-promote-contract-seam.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t-release-sync-plan.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t-runner-prune-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-runtime-dispatch-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t-runtime-learnings-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-sensor-fire-glob-norm.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t-sensor-fire-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t-test-size-drift.test.ts","tier":"unit","measured":"medium","declared":"medium","signals":["spawn","filesystem"]}
{"file":"tests/unit/t-test-size-dynamic.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t-tui-drive-socket-isolation.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t04-agent-frontmatter.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t05.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t06-skill-frontmatter.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t07-hook-audit-logger.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t08.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t09.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t10-hook-session-start.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t100-memory-template-lifecycle.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t103.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t106.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t107.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t108.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t109.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t11.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t110-mcp-server-grants.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t111.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t112-delegated-approval.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t112-learnings-distribution-guard.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t113.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t114-orchestrate-next.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t115.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t116-directive-path-resolution.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t117.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t118.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t123-skills-spec-conformance.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t124-scope-transpose.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t125-scope-files.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t125.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t129-stage-runner-drift.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t13-hook-input-robustness.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t132-hooks-doc-count-sync.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t133-bolt-dag-compile.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t134-mechanism-honesty.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t14.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t140-sdk-drive-model-resolution.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t142-tui-drive-setting-sources.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t144-harness-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t146-core-hygiene.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t147-kiro-hook-adapter.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t149-codex-hook-adapter.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t15-knowledge-file-inventory.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t150-codex-packaging.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t151-onboarding-skeleton.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t152-windows-portability.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t153-engine-directive-harness-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t154-codekb-promotion.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t155-template-override.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t156-memory-relocation.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t157-workspace-shell-seed.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t158-memory-writer-reader-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t16-phase-rules-structure.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t160-workspace-record-resolution.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem","timer"]}
{"file":"tests/unit/t161-per-intent-lock-reaper.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t167-session-intent-helpers.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t168-statusline-orientation.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t169-session-resume-rebind.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t17.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t170-audit-logger-per-intent.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t174-docs-legacy-refs-gate.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t177-workspace-journey-fixture.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t178-classify-terminal-command.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t179-orchestrate-rollforward-guard.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t18.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t180-kiro-rollforward-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t181-conductor-skill-parity.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t182-codekb-placement.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t184-stage-graph-drift.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t186-foreach-per-unit-iteration.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t188-human-presence-gate.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t19.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t190-validate-grid.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t191-composed-scope-write.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t194-recompose.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t198-compose-surfaces.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t199-grilling-distribution.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t20.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t200-promote-self-composed-scope.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t202-hook-project-dir-worktree-marker.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t202-sensor-type-check-tsc-launcher.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t203-codekb-rescan.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t203-mint-presence-classify.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t204-audit-escape.pbt.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t205-audit-escape-seams.test.ts","tier":"unit","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/unit/t206-source-work-intent-span.test.ts","tier":"unit","measured":"medium","declared":"medium","signals":["spawn","filesystem"]}
{"file":"tests/unit/t207-swarm-guards.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t207-worktree-base-freshness.test.ts","tier":"unit","measured":"medium","declared":"medium","signals":["spawn","filesystem"]}
{"file":"tests/unit/t208-hook-shard-guards.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t208-presence-crossshard-tiebreak.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t209-kiro-ide-dual-vocab.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t209-promote-self-dangling-symlink.test.ts","tier":"unit","measured":"medium","declared":"medium","signals":["filesystem"]}
{"file":"tests/unit/t209-stop-hook-state-verb-carveout.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t209-worktree-read-anchor.test.ts","tier":"unit","measured":"medium","declared":"medium","signals":["spawn","filesystem"]}
{"file":"tests/unit/t210-adapter-mint-classifier.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t210-doctor-worktree-anchor.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t211-doctor-shell-3state.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t211-log-subagent-complete-gate.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t211-swarm-batch-progress.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t211-workspace-scan-generalize.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t212-learnings-surface-selfheal-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t213-orchestrate-parked-new-intent.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t214-engine-error-logged-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t216-orchestrate-default-errlog.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t218-import-meta-main-guard.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t219-audit-fork-reentrant-seam.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t220-run-tests-totals.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t220-worktree-slug-normalize-seam.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t221-doctor-phase-progress.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t221-metrics-snapshot-cli.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t221-metrics-snapshot-collectors.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t221-metrics-snapshot-core.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t222-ci-snapshot-wiring.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t223-settings-skeleton.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t229-coverage-patch-gate.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t230-metrics-timeseries.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t231-metrics-retention.test.ts","tier":"unit","measured":"small","declared":null,"signals":[]}
{"file":"tests/unit/t26-delivery-agent-timeline-guardrail.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t27.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t28-audit-event-sync.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t29.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t30-hook-session-end.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t31.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t33.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t34.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t35.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t36.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t37.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t38.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t46-agent-no-numeric-stage-ids.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t60.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t61.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t62.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t63.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t64.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t67.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t68-version-changelog-sync.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t69.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t70-worktree-kb-and-skill.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t71.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t72.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t76.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t77-bolt-worktree-flags.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t79.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn"]}
{"file":"tests/unit/t80.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t81.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t82-hold-merge-invariant.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t83-doctor-orphan-worktree.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t84.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t85.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t86-sensor-manifest-schema.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t87-stage-compartment-headers.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
{"file":"tests/unit/t88.test.ts","tier":"unit","measured":"small","declared":"small","signals":[]}
{"file":"tests/unit/t94-sensor-fire-hook.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t96.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["spawn","filesystem"]}
{"file":"tests/unit/t97.test.ts","tier":"unit","measured":"medium","declared":null,"signals":["filesystem"]}
```

## Files created / modified

| file | action | 内容 |
| --- | --- | --- |
| `code-generation-plan.md` | modified | Step 1〜8 の実証状況を checkbox で更新 |
| `code-summary.md` | created | 442-row 台帳、matrix、consumer contract、再現・検証証跡 |

application code、tests、test configuration、packages、scripts、dist、runner、collector、CI の作成・変更はない。

## Key implementation decisions

- generic code-generation の code/test 生成より、承認済み FR-7・U1 境界・人間指示を優先した。
- 追加 module や生成 script を作らず、正式 record への materialize に限定した。
- 現行 classifier と collector は read-only に再利用し、二重分類器や未配線 adapter を追加しなかった。

## Test coverage summary

- **実行面**: measurement ref の repo 外 read-only export
- **command**: `bun test tests/unit/t-test-size-drift.test.ts tests/unit/t221-metrics-snapshot-core.test.ts tests/unit/t221-metrics-snapshot-collectors.test.ts tests/unit/t221-metrics-snapshot-cli.test.ts tests/integration/t221-metrics-snapshot.integration.test.ts`
- **exit code**: `0`
- **結果**: 5 files、39 pass、0 fail、66 `expect()` calls
- **artifact validator**: row count、rows exact、matrix total、observedRef、collector keys、collector values の6検査すべて `true`
- **新規 test files / test config**: N/A。新規 executable behavior がなく、既存 classifier/drift と collector の unit/integration tests を再利用した。E2E/performance/security test の新設対象も存在しない。

最初の shell 文字列による起動試行は zsh が全体を1語として扱い exit 127 となり、テスト自体は未起動だった。引数配列へ直して上記 final run を実行したため、PASS verdict は exit 0 の final run のみに基づく。

## Deviations from plan

なし。application code/test/config の N/A は計画承認時に明示済みで、未申告の逸脱ではない。

## Scope / diff guard

- **non-audit protected files**: 2,728 files。開始時/終了時 SHA-256 manifest は完全一致。
- **Git status の増分**: `code-summary.md` 1件のみ。消失した status entry は0件。
- **直接書込対象**: `code-generation-plan.md` と `code-summary.md` のみ。
- **不変を実証した面**: `.claude/tools`、`.codex/tools`、`.github`、`dist`、`packages`、`scripts`、`tests`、`amadeus-state.md`、全 `memory.md`。
- **Out 境界**: 実テスト移設、新分類器、生成スクリプト/CI恒常配線、collector consumer統合、tier-aware gate、#683 配線、#1157 への直接変更なし。

audit shard は artifact への `apply_patch` に反応する既存 PostToolUse hook が `ARTIFACT_CREATED/UPDATED` を append したため開始時ハッシュから変化した。audit tool・sensor・engine は呼び出しておらず、audit を直接編集・巻き戻ししていない。この hook-owned append は direct-write scope から分離して記録する。

## Review

- **Reviewer:** `amadeus-architecture-reviewer-agent`
- **Iteration:** 1
- **Verdict:** NOT-READY
- **Date:** 2026-07-17T19:42:54Z

### Findings

| # | Severity | Location | Finding | Required action |
| --- | --- | --- | --- | --- |
| 1 | Major | `code-summary.md:17-19,79,84-180` | 掲載された再現コマンドが出力する pretty JSON（2-space indent + 末尾 LF）を、掲載442 rows・11-key matrix・observedRefから再構成した SHA-256 は `8b1d084d79bb5a8719ea23c5c36910cbc5aec1d9305194d497b2c55258892f84` であり、run 1 / run 2 として記載された `bbdd75f662486ad5f4bcbababfba9d0d3f29ef56e46906c5f113ef2800880247` と一致しない。したがって「2回の canonical JSON stdout の byte 比較」の証跡を、成果物内の再現手順から監査できない。 | 実際の掲載コマンドを2回実行した stdout hashへ run 1 / run 2を更新するか、`bbdd75f…` を生成した正確な canonicalization / field order / newline 契約と再現コマンドを掲載し、2回の一致を再検証する。 |

### Validation evidence

| 検証 | 結果 |
| --- | --- |
| 計画承認 | PASS — Q&A は `1` を A「Approve Plan」として記録している。 |
| measurement ref | PASS — `3917a283a953165866170d235d3dc25ad2fd3643^{commit}` は同一 SHA へ解決した。 |
| exact-ref 独立スイープ | PASS — Git objectから442候補を読み、対象refと同一blobの `classifyTestSize` / `parseSizeAnnotation` で再分類した結果、掲載442 rowsと全行・順序・fieldが一致した。 |
| matrix | PASS — 非ゼロ11 key、合計442。各 key/value は掲載表と一致した。 |
| consumer contract | PASS — `observedRef`、rows、`${tier}_${measured}` matrix、complete / incomplete / fatal、read failureの非縮退が上流U1契約と整合する。 |
| canonical compact digest | PASS — `{observedRef,rows,matrix}` の compact JSON SHA-256 は `d2525dff03c4dbc2623332c867a71daf8fa217f061f6ac547c2fcfc966667142`。 |
| targeted tests | PASS — 5 files、39 pass、0 fail、66 `expect()` calls。 |
| scope guard | PASS — 成果物はapplication code、test、runner、collector、CI、#1157を本stageの変更対象に含めず、既存dirty変更を本stage成果と扱っていない。 |
| stdout hash再現 | **FAIL** — 掲載コマンドの再構成値 `8b1d084d…` と記載値 `bbdd75f…` が不一致。 |

### Summary

台帳本体、上流契約、exact ref、442 rows、11-key matrix、consumer/failure contract、指定compact digest、targeted tests、scope境界はすべて整合する。残るblockingはstdout hash証跡の自己不整合1件だけであり、記載値または再現契約を実測に合わせて修正後、iteration 2で再レビューする。

## Review — Iteration 2

- **Reviewer:** `amadeus-architecture-reviewer-agent`
- **Iteration:** 2
- **Verdict:** READY
- **Date:** 2026-07-17T19:47:01Z

### Findings

新規findingなし。Iteration 1のMajor 1件は解消済み。

### Validation evidence

| 検証 | 結果 |
| --- | --- |
| Iteration 1 finding | PASS — run 1 / run 2はともに `8b1d084d79bb5a8719ea23c5c36910cbc5aec1d9305194d497b2c55258892f84` へ更新され、掲載コマンドのpretty JSON（2-space indent + 末尾LF）再構成値と完全一致した。 |
| byte-equivalence | PASS — run 1 / run 2のSHA-256が一致し、掲載442 rowsから再構成したstdout byteとも一致した。 |
| measurement ref / exact rows | PASS — `3917a283a953165866170d235d3dc25ad2fd3643` のGit objectを独立スイープし、442候補と掲載442 rowsが全行・順序・field単位で一致した。classifier blobも対象refと一致した。 |
| matrix | PASS — 非ゼロ11 key、合計442。掲載表とrowsからの再集計が完全一致した。 |
| canonical compact digest | PASS — `{observedRef,rows,matrix}` のcompact JSON SHA-256は `d2525dff03c4dbc2623332c867a71daf8fa217f061f6ac547c2fcfc966667142` のまま不変。 |
| consumer / failure contract | PASS — observedRef、rows、tier×size matrix、complete / incomplete / fatal、部分失敗の非縮退は上流U1契約と引き続き整合する。 |
| targeted tests | PASS — 5 files、39 pass、0 fail、66 `expect()` calls。 |
| approval / scope guard | PASS — Q&Aの`1`→A「Approve Plan」、application code・test・runner・collector・CI・#1157を変更しない境界、既存dirty変更の分離はいずれも維持されている。 |
| review history | PASS — Iteration 1のReview、442 rows、計画承認記録は保持され、修正はrun hash証跡に限定されている。 |

### Summary

Iteration 1で検出したstdout hash証跡の自己不整合は解消された。exact ref、442 rows、11-key matrix、consumer/failure contract、compact digest、テスト、承認、scope境界に回帰はなく、blocking findingは残っていないためREADYと判定する。
