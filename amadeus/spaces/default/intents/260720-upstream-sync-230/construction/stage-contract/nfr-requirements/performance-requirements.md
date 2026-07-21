# Performance Requirements — stage-contract

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。pure schema/graph pipelineであり、service latency SLOは追加しない。

## 有界処理

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U01-01 | parse→validate→compileは単一UnitKind語彙と検証済みstage列を使う。 | graph/directive/sensor側の第二parser・第二語彙0。 |
| PERF-U01-02 | kind filterはrequired+optional候補unionへ一度適用し、coverageはrequired subsetを使う。 | directive/coverageの重複走査・非対称0。 |
| PERF-U01-03 | kind未指定/map未指定は元full matrixを返す。 | speculative prune 0。 |
| PERF-U01-04 | compile再実行は同一bytesを生成する。 | identical inputのruntime graph byte差分0。 |

## Verification gate

table-driven schema/pruning tests、golden byte testsと`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。push前local lcovでpatch追加行未カバー0を確認し、spawn blind spotは実測後のin-process seam、waiverは既決証拠条件を満たす残余行だけとする。

## トレーサビリティ

PERF-U01-01〜04は`business-rules.md`のBR-U01-01〜15、`business-logic-model.md`のContract pipeline、`requirements.md`のNFR-1〜8、`technology-stack.md`に対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T15:37:41Z`
- Verdict: **READY**
- Scope decision: **none**

### Findings

- **BLOCKER: 0 / MAJOR: 0 / MINOR: 0**

### Architecture checks

- E-USSUFD1/FD2、E-USSU01FD3=AとBR-U01-01〜15をNFRへ機械導出しており、UnitKindのlib単一所有と正準4 public seamを維持する。parse/emit/filterを公開面へ追加しない。
- `number`、`name`、`bundle`、`when`、`required_sections`はupstream exact-shapeだけを受理し、追加trim/sort/dedupe等のcanonicalizationを行わない。field absent時はpropertyを生成せず、既存parse/compile/emit bytesを不変にする。
- unknown kind、wrong type、empty/malformed field、unknown `when` predicate、orphan/empty/duplicate `produces_kinds`は全mutation前に拒否され、source、graph、state、audit、生成物のbefore/after bytesを保持する。
- kind未指定またはmap未指定はfull matrix、required/optional候補は同一filterで対称pruning、filter後required 0だけをvacuously covered、元required 0は実行証拠なしとして区別する。
- directive、coverage、approval guardは同一typed snapshotを共有し、applicable requiredがあるUnitは全file実在までuncoveredとなる。optional artifactをcoverage requirementへ昇格しない。
- NFR-5のtable-driven/golden/pruning/approval testsと5つの最終gate、NFR-6のpatch追加行未カバー0、in-process seam、既決waiver条件が明記されている。
- accepted schema、failure policy、kind mapping、vacuous semanticsを新規拡張せず、未承認SLO、追加public API、schema DSL、when evaluatorも導入していない。

### Sensor results

- **11/11 PASS**: `required-sections` 5/5、`upstream-coverage` 5/5、`answer-evidence` 1/1。
- `linter` / `type-check`: 対象となるTypeScript/JavaScriptコード成果物なし。
