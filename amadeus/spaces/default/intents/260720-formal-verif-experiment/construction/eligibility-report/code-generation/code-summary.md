# Code Summary — eligibility-report (U8, Bolt 4 最終ユニット)

## 上流入力(consumes 全数)

business-logic-model.md / business-rules.md / domain-entities.md(functional-design)、logical-components.md / performance-design.md / reliability-design.md / scalability-design.md / security-design.md(nfr-design)、nfr-requirements、unit-of-work.md(§ eligibility-report)、requirements.md、bolt-plan.md(§ B4)、既存実装 scripts/formal-verif/(U1〜U7)。

## 生成・変更ファイルと LOC(wc -l 実測)

| ファイル | LOC | 種別 |
| --- | --- | --- |
| scripts/formal-verif/eligibility.ts | 128 | 新規(source) |
| scripts/formal-verif/eligibility-report.ts | 125 | 新規(source) |
| scripts/formal-verif/final-cli-root.ts | 47 | 新規(source) |
| scripts/formal-verif/index.ts | +3 | 変更(export 追加) |
| tests/unit/t-formal-verif-eligibility.test.ts | 137 | 新規(test) |
| tests/unit/t-formal-verif-eligibility-report.test.ts | 120 | 新規(test) |
| tests/unit/t-formal-verif-final-cli-root.test.ts | 69 | 新規(test) |

source 3 ファイル合計 **300 LOC**(予算 300–460 内)。

## 実装内容(BR トレース)

### eligibility.ts — hard eligibility / Pareto / decision / Alloy
- `verifyStructure`: U7 `FullMatrixValidation` を CompleteMatrix / 唯一 HARNESS_ERROR_CELL の StructurallyCompleteHarnessMatrix のみ通し、他 finding は `EvaluationFailure(STRUCTURAL_INCOMPLETE)`(BR-01)。missing を NOT_DETECTED へ丸めない。
- `classifyArm`: 全 defect DETECTED / HARNESS_ERROR 0 / baseline 全 NOT_DETECTED で Eligible、それ以外は distinct reason(DEFECT_NOT_DETECTED / HARNESS_ERROR / BASELINE_FALSE_POSITIVE)を保存した Ineligible(BR-02〜05)。
- `comparePareto`: 3軸 strict dominance、trade-off / 完全同値 = NON_DOMINATED_PAIR(BR-08)。weighted sum / 単位換算 / tie-break / SHARED_LOC 按分なし(BR-09)。
- `closeDecision`: 片方 eligible → candidate、両 ineligible → BOTH_INELIGIBLE(cost 不要)、両 eligible → cost 必須 + Pareto(BR-06/07)。cost 欠損・負値は `EvaluationFailure`、BOTH_INELIGIBLE へ丸めない。`EvaluationIdentity` は canonical.ts 決定性で再現(BR-17)。
- `assessAlloy`: NOT_DETECTED defect を miss registry へ、両 arm 共通 contract class を common blind spot、`SEPARATE_DECISION_REQUIRED` / `NOT_TRIGGERED`(BR-10〜12)。Alloy 実装/追加/比較なし。
- `deriveMeasuredCells`: U7 `FullMatrixRun` の MEASURED suite から MeasuredCell view を導出。

### eligibility-report.ts — reproducible report / trace verification
- `verifyReversalMappings`: 6体グリリング正本 conditions と mapping の bijection、非空 support/refute refs、未対応・創作・source drift・text hash drift を拒否(BR-17a)。
- `buildReportModel`: matrix cell / cost / decision / reversal mapping 各 row と `ReportIdentity` を canonical に結合(BR-13)。
- `verifyTrace`: row と source refs(command receipt / CI run-job / artifact)の bijection、content hash、semantic key を再検証。missing / duplicate / hash drift / semantic drift / orphan / incomplete refs を全数保持(BR-14)。
- `renderReport`: VerifiedTraceIndex のときだけ canonical JSON + escaped Markdown を生成、それ以外は `ReportFailure(UNVERIFIED_TRACE)`(BR-15)。decision を model から copy し再計算しない(BR-16)。Markdown は control byte を空白化し `\ ` `*` `|` 等の meta を escape(制御バイトは charCodeAt ベースで regex 制御リテラル混入を回避 = control-byte-guard 準拠)。

### final-cli-root.ts — wiring-only final CLI root
- `composeFinalCli`: U1 `COMMAND_KINDS`(全11 command)と HandlerBinding の bijection、exactly one handler、MISSING / DUPLICATE / UNKNOWN を拒否し U1 `HandlerRegistry` + `CommandRouter` を構築(BR-18/19)。評価/Pareto/Alloy/report を実装しない。
- `verifyWiring`: closed command set の exact equality と handler identity 一意性(BR-20)。error/exit propagation は U1 CommandRouter が handler Result を無変換で返すことで担保(テストで実証)。
- `FINAL_COMPOSITION_STATUS = "DESIGNED_BLOCKED_ON_FINAL_FD_GATE"` を composition に焼き込み、integration readiness / completion を主張しない(BR-21/22)。full-matrix.ts の `MATRIX_INTEGRATION_STATUS` と同型。

## 検証結果(実測 exit code)

| コマンド | exit code | 備考 |
| --- | --- | --- |
| `bun x tsc --noEmit -p tsconfig.json` | 0 | scripts 型検査 0 error |
| `bun x tsc --noEmit -p tsconfig.tests.json` | 非0(既存 red 9件) | 自 unit 由来 0件(grep `eligibility\|final-cli` = 空)。9件は B1 skeleton harness の既存 red でスコープ外 |
| `bunx @biomejs/biome check <変更7ファイル>` | 0 | Checked 7 files、warning 0(初回の cognitive-complexity 2件は closeDecision/verifyTrace のヘルパー抽出で解消) |
| `bun test <自 unit 3件>` | 0 | 全 pass |
| `bun test <自3件 + contract 回帰>` | 0 | Ran 91 tests across 4 files、91 pass / 0 fail |
| `bun test tests/unit/t-formal-verif-contract.test.ts` | 0 | 回帰 spot green |

## 自 unit テストファイル(convergence check 用)

- tests/unit/t-formal-verif-eligibility.test.ts
- tests/unit/t-formal-verif-eligibility-report.test.ts
- tests/unit/t-formal-verif-final-cli-root.test.ts

## deslop

harness 登録の deslop skill が本ハーネスに未登録のため手動 deslop を実施: 既存 formal-verif の dense one-liner / Result / canonicalIdentity 様式に一致、コメントは wiring-only・DESIGNED_BLOCKED 不変条件の load-bearing な記述(full-matrix.ts のヘッダコメント様式に準拠)、source に `any` キャストなし、過剰防御は degenerate-arm ガード1点のみ。テストの `as unknown as CanonicalInputSet` は限定的な test double。

## 逸脱

なし(実装前停止事項なし)。設計との境界判断: NFR 設計が記述する process isolation / TrustedReportPublisher / ReportRevisionClaim store / SandboxedReportWorker の物理実装は、logical-components.md の「Test seams: port 化」の設計意図と LOC 予算(300–460)に基づき、本 code-generation では pure domain core を port ベースで実装し物理層は別 tier とした。この境界は unit-of-work.md 完成条件(handler 一意性・error propagation・同一 evidence からの同一 closed decision 再計算・全 row の command/CI/artifact 到達)に忠実であり、責務追加でなく分解に沿う。code-generation-plan.md § スコープと境界に記載済み。
