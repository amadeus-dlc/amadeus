# Driver Contract & Selection Policy Performance Requirements

## 上流と測定境界

本成果物はU-01の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。測定対象はpure parse/classify/select/schema projectionであり、provider probe、process、filesystem、audit、checkpointを含めない。

上流どおりprovider実行時間やtoken消費の数値SLOは設定しない。性能はwall-clockではなく、決定的なcall count、計算量、allocation boundで規定する。

## Quantified requirements

| ID | Metric | Target | Load condition | 検証 |
|---|---|---|---|---|
| U01-PERF-01 | external I/O/process/filesystem/clock/random call | exactly 0 | 全入力 | injected port不在 + static dependency test |
| U01-PERF-02 | env key read | 既知2 keyのpresence/classificationだけ | 任意env map | canary keyを読まないfixture |
| U01-PERF-03 | driver candidate evaluation | 最大4 native descriptor、harness候補列の各要素を最大1回 | `auto` worst case | spy count |
| U01-PERF-04 | topology normalization | time `O(n log n)`以下、追加memory `O(n)`以下 | `n` signals | comparator/count instrumentation |
| U01-PERF-05 | selection after normalized input | driver集合が固定のため`O(n)`以下 | `n` capability details | property test |
| U01-PERF-06 | output serialization | output field countに線形、未知field copy 0 | success/error全variant | canonical serializer test |
| U01-PERF-07 | repeated evaluation | shared cache 0、前回入力に依存0 | 10,000 generated cases | fast-check反復 |

`n`は既存swarmが受理するUnit/topology signal数であり、U-01は上限を拡張しない。10,000はCIのproperty sample数で、製品latency SLOではない。

## Resource constraints

- input全体のdeep cloneを複数回作らず、canonical projectionを1件だけ構築する。
- raw env map、raw capability payload、provider stderrを保持しない。
- global/singleton cache、memoization、worker poolを追加しない。
- fixed driver/harness/reason orderはimmutable constantを共有し、実行時に再構築しない。
- stack recursionを使わず、入力数に比例するiterative collection処理とする。

## Regression gate

wall-clockのmachine差をmerge gateに使わない。次の構造的regressionをfailにする。

1. I/Oまたはprovider callが1件以上追加された。
2. 同じcandidateを複数回評価した。
3. topology処理がquadratic comparator/cross-productになった。
4. raw input sizeに比例しないunbounded cacheを作った。
5. 10,000 generated caseでtimeout/heap exhaustion/非決定結果が出た。

## 非目標

provider CLI latency、native batch duration、audit lock、worktree creation、network throughputはU-01のperformance requirementではない。cache、parallelization、native addonを追加してpure policyを複雑化しない。

