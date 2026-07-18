上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 性能設計 — U2 層責務仕様と tier-aware 判定

本設計は `performance-requirements.md` の O(N) 判定・比率目標・実行時間予算 PENDING、`security-requirements.md` の台帳入力境界、`scalability-requirements.md` の開いた tier、`reliability-requirements.md` の fail-closed、`tech-stack-decisions.md` の既存型再利用、および `business-logic-model.md` の tier×measured フローを具体化する。実装、runner/CI 配線、強制ゲート化は対象外である。

## PERF-D1: 台帳1回走査の評価 pipeline

入力は U1 が `complete` と確定した `SizeLedger` とし、`incomplete` / `fatal` な上流結果や observed ref のない台帳を評価しない。これらは `reliability-design.md` REL-D1 の `admission-rejected` を返し、行走査を開始しない。`allowedMaxSize` は `logical-components.md` LOG-D1 の4行表を唯一の値定義とし、行は U1 の file 昇順を保ったまま次の順で1回だけ処理する。

1. zero-based `rowIndex` を付け、`file`、`tier`、`measured` を独立に exact validation する。同じ走査で valid measured を `small|medium|large`、不正 measured を `unclassified` に1回だけ数える。
2. 不正 field があれば `file → tier → measured` の固定優先順位で最初の1件だけを REL-D2 の `IndeterminateDiagnostic` にし、その行を indeterminate に1回だけ数える。後続の policy 判定には渡さない。
3. 全 field が valid な行の `tier` を exact match で `NamedTier(unit|integration|e2e|smoke)` または承認済み補助 tier `harness|lib` に分類する。registry 外は手順2の `invalid-tier` であり、ここへ到達しない。
4. NamedTier 行だけ `allowedMaxSize(tier)` を1回引き、`SIZE_ORDER[measured] > SIZE_ORDER[allowed]` を1回比較して `detectTierSizeViolation` の結果を得る。
5. 補助 tier 行は `not-applicable` として件数だけを保持し、`none` に偽装せず detector へ渡さない。
6. ratio は indeterminate が0のときだけ、補助 tier も含む全行を分母にする。診断は入力順、すなわち `rowIndex` 昇順のまま保持し、追加 sort は行わない。

分類器の再実行、source/FS の再読込、allowlist 読込、network、child process、cache、worker fan-out は target pipeline に含めない。

## PERF-D2: 計算量と資源境界

N を台帳行数、V を over-limit 件数、I を判定不能行数かつ診断件数とする。tier membership、上限 lookup、序数比較、size count は固定個数の処理なので時間 O(N)、追加メモリ O(V + I) とする。1行から診断を複数生成せず、行ごとの再 sort は行わないため、決定性は U1 の file 順を継承する。

measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` の442行に対する over-limit 163件は設計 IF の検証 oracle であり、ループ上限、allowlist、容量定数へハードコードしない。比率も固定442ではなく `summary.total` から再計算する。

## PERF-D3: 現行 purity ratchet との性能差

現行 `tests/unit/t-test-size-drift.test.ts` には tier×size purity ratchet が既にあり、FS 全域走査、source 読取、`classifyTestSize`、private `MAX_SIZE_BY_SCOPE`、allowlist を使う。planned `allowedMaxSize` / `TierDriftReport` は未実装であるため、「tier-aware 判定が全面的に存在しない」とは扱わない。

将来実装は既存 assertion/ratchet と CI 到達性を維持しつつ、同 test を U1 台帳と共通 policy の consumer に移す。並行する第2 gate や第2 policy を追加しない。本 intent では現行 test、allowlist、runner、CI を変更しない。

## PERF-D4: 比率と実行時間予算

比率は `RATIO_TARGET_SMALL_MIN=50%`、`RATIO_TARGET_MEDIUM_MAX=45%`、`RATIO_TARGET_LARGE_MAX=5%` と比較するが、ガイドライン表示に限定し verdict や exit codeへ接続しない。

`TIME_BUDGET_{TIER}_SECONDS` は PENDING を維持する。確定前に既存 runner の `--smoke` / `--unit` / `--integration` / `--e2e` を同一 HEAD・同一 host・CI と同じ直列条件で個別実行し、command、observed ref、host/OS、Bun version、件数、成否、wall-clock を一次証拠として保存する。試行回数、集約式、余裕率、秒数は実測後に推奨案を人間へ直接提示して承認を得るまで発明しない。CI job の20分 timeout は tier 別予算ではない。

## PERF-D5: 検証可能な受け入れ条件

- admission済みの同一台帳に対し、各行の validation/applicability 判定は各1回、NamedTier 行の lookup・序数比較は各1回である。
- admission失敗時は閉じた3理由の `admission-rejected` を返し、行走査、observation、diagnostics、reportを構成しない。
- `total = governed + auxiliary + indeterminate`、`indeterminate = diagnostics.length` である。complete 時は `violationCount = report.violations.length`、indeterminate 時は valid NamedTier の内部over-limit candidate数と一致する。
- indeterminate が1件でもあれば authoritative な zero-violation report を返さない。
- complete 時は small/medium/large count 合計が `summary.total` と一致し、indeterminate 時は authoritative ratio を返さない。
- diagnostics は1行1件以下、`rowIndex` 昇順で、raw不正値・absolute path・runtime messageを含まない。
- target pipeline は source read と `classifyTestSize` を呼ばず、既存 ratchet と並行する重複 gate を作らない。

## Review

**Verdict:** NOT-READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T18:24:55Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `performance-design.md` PERF-D1、`reliability-design.md` REL-D3/REL-D4、`logical-components.md` LOG-D1/LOG-D4 | `Tier Limit Policy` を4 NamedTier の exhaustive lookup とする一方、成果物内には `NamedTier → TestSize` の対応表がない。smoke の target が medium であることだけは LOG-D4 に現れるが、残る tier の値と単一定義点をこの設計から構成できず、163件 oracle を再現する policy を実装者が推測する必要がある。 | 承認済み上流 policy を4行の対応表として明記し、`allowedMaxSize` の唯一の定義点、exhaustive 検査、smoke を含む全値を同じ節へ集約する。 |
| 2 | Major | `security-design.md` SEC-D1、`reliability-design.md` REL-D1/REL-D2、`logical-components.md` LOG-D1/LOG-D3 | upstream `incomplete` / `fatal` / observed-ref欠落は Evaluation Boundary が reject すると定める一方、`TierEvaluationOutcome` は admission 後の complete/indeterminate しか表せず、reject の logical result、reason、呼出側との I/O が未定義である。exported 型・exit codeを後続へ残しても、境界を実装するには拒否状態を例外・null・別 union のどれにするか追加判断が必要になる。 | exit codeやserializationとは分離して、少なくとも `admission-rejected` の閉じた reason（upstream-incomplete / upstream-fatal / observed-ref-missing）を含む論理 Result を定義し、Evaluation Boundary の I/O と依存図へ反映する。 |
| 3 | Major | `performance-design.md` PERF-D1/PERF-D2、`security-design.md` SEC-D1/SEC-D2、`reliability-design.md` REL-D1/REL-D3、`logical-components.md` LOG-D1/LOG-D3 | indeterminate outcome の `diagnostics` が未定義である。invalid file/tier/measured の kind、1行に複数不正がある場合の集約規則、順序、保持する識別子がなく、特に malformed `file` は「repository 相対 path だけを出力する」制約の下でそのまま診断へ載せられない。O(V + I) と byte-equivalence もこの shape なしには検証できない。 | 行診断を閉じた判別 union として定義し、validation precedence、1行あたりの件数、安定順序、malformed file 時に raw 値を漏らさず行を識別する方法を明記する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `required-sections` | PASS: 5/5（audit `SENSOR_PASSED`、fire `bb7af42e` / `a5c8fbe7` / `e4a1bd23` / `642f422a` / `9f680873`） | 5成果物はいずれも stage の文書形状要件を満たす。 |
| `upstream-coverage` | PASS: 5/5（audit `SENSOR_PASSED`、fire `3e8f5075` / `2b17c9f4` / `7b240a73` / `f5ec09ca` / `97c91a34`） | 5成果物はいずれも stage が宣言する6つの上流 artifact を参照する。 |
| `answer-evidence` | PASS: 1/1（audit `SENSOR_PASSED`、fire `df163975`） | Q1/Q2 の回答と parse 可能な人間承認 timestamp がある。 |
| `linter` | N/A: manifest `matches` に合う `*.ts` / `*.js` 成果物なし | Markdown 成果物へは fire していない。 |
| `type-check` | N/A: manifest `matches` に合う `*.ts` / `*.tsx` 成果物なし | Markdown 成果物へは fire していない。 |
| Q&A A/A 反映 | PASS | Named / approved auxiliary / invalid の3分類、`harness|lib` registry、unknown fail-closed、時間予算 PENDING が5成果物で一致する。 |
| 5成果物の契約トレース | FAIL: Major 3件 | policy 値、admission reject、row diagnostics の3契約が実装可能な shape に閉じていない。 |

### Summary

Q&A A/A、O(N) 評価、既存 ratchet への収束方針、時間予算 PENDING、スコープ境界は整合している。一方、policy の実値、admission rejection、indeterminate diagnostics という中核契約が未定義であり、開発者が追加の設計判断なしに実装できないため NOT-READY と判定する。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T18:33:42Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| — | — | — | 新規 finding なし。iteration 1 の Major 3件はすべて解消された。 | — |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| iteration 1 findings | PASS: 3/3 resolved | LOG-D1 の4行 policy/exhaustive 契約、3 variant・3 reject reason の `TierEvaluationResult`、閉じた3 kind の `IndeterminateDiagnostic` が全成果物で一致する。 |
| `required-sections` | PASS: 5/5（audit `SENSOR_PASSED`、fire `a97a8c10` / `4af7a55b` / `347e483f` / `53487d1c` / `216659c7`） | 修正後の5成果物はいずれも stage の文書形状要件を満たす。 |
| `upstream-coverage` | PASS: 5/5（audit `SENSOR_PASSED`、fire `cc03c791` / `29a91724` / `52ef1d60` / `23b3168a` / `db9654b4`） | 修正後の5成果物はいずれも stage が宣言する6つの上流 artifact を参照する。 |
| `answer-evidence` | PASS: 1/1（audit `SENSOR_PASSED`、fire `3ac989ad`） | Q1/Q2 の回答と parse 可能な人間承認 timestamp がある。 |
| `linter` | N/A: manifest `matches` に合う `*.ts` / `*.js` 成果物なし | Markdown 成果物へは fire していない。 |
| `type-check` | N/A: manifest `matches` に合う `*.ts` / `*.tsx` 成果物なし | Markdown 成果物へは fire していない。 |
| count invariants | PASS | `total = governed + auxiliary + indeterminate`、`indeterminate = diagnostics.length`、size count総和、complete/indeterminate別 violationCount が排他的な行分類と整合する。 |
| 現行 ratchet 差分 | PASS | target policyの4値、現行 `smoke:null`、allowlist縮小性、CI到達性、declared-vs-measured gateの扱いが区別され、二重policy/gateを要求しない。 |
| Q&A・スコープ境界 | PASS | 3分類、`harness|lib`、unknown fail-closed、時間予算 PENDINGを維持し、実装、runner/CI/docs、#1157へ変更を広げない。 |

### Summary

iteration 1 の Major 3件は矛盾なく解消され、policy、admission、行診断、count invariants、既存 ratchet との差、Q&A A/A、スコープ境界が一貫している。開発者が追加のアーキテクチャ判断なしに後続実装へ進めるため READY と判定する。
