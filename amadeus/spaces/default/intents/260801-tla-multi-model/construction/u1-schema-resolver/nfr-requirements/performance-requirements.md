# Performance Requirements — u1-schema-resolver

## 上流境界

`business-logic-model.md` の C1 スキーマ拡張(4形 exactObject 分岐)/ C2 リゾルバ(行ベース抽出 + ワークリスト推移閉包)、`business-rules.md` の BR-S1(省略モデル不変)/ BR-R5(決定的正規化)/ BR-R8(純粋モジュール)、`requirements.md` の NFR-1(後方互換)/ NFR-4(新規外部依存なし)を正本とする。CI ジョブ 30 分 timeout との実測整合は u5(FR-5)が所有し、本書は u1 が消費する時間増分の境界のみを定める。

## 計算量と実行時間の境界

- リゾルバ(C2)の計算量はソース行数・モジュール数に対して**線形**: 抽出はコメント除去 + 行走査で O(行数)、推移閉包は `visited` 集合付きワークリスト BFS で O(モジュール数 + 辺数)。同一モジュールは1回だけ読む(訪問済み管理、BR-R4 の循環検出と同一機構)。
- スキーマパース(C1)の追加コストは許可キー集合4形の `some` 判定で O(1)(キー数は最大6)。BR-S1 どおり省略モデルは従来形分岐へ入り、パース経路・戻り値とも変更前と同一のため**性能特性も不変**。
- 測定目標: 現行規模(specs/tla 内 4 モジュール、最大ファイルは MirrorLifecycleCore.tla の数百行)で、リゾルバの全登録モデル一巡は loader 検証内で **1 秒未満**(開発マシン実測)。u1 が CI formal-model-check ジョブに追加する時間増分はこの範囲に収まり、30 分 timeout(ci.yml:513)への影響は無視できる。超過が疑われる場合は u5 の実測(ADR-8 measure-first)で判定し、本 Unit で推測による予防的最適化は行わない。

## 決定性・資源の境界

- 出力決定性(性能要件としても要求): `resolveAuxiliaryModules` はソート済み・重複排除・起点除外の配列を返し(BR-R5)、同一入力には常に同一 byte の出力。走査順・集合実装に依存する揺らぎを禁止する。
- メモリ: モジュールソースは1モジュールずつ `readModule` 注入経由で取得し、全モジュールのソースを同時に heap へ保持しない。retained data は訪問済みモジュール名集合・ワークリスト・抽出済み参照名に限定する(モジュール名は TLA 識別子で数十 byte、現行規模で数十 KB 以下)。
- 新規外部依存なし(BR-R8 / NFR-4)のため、起動時の依存解決コスト増分はゼロ。`tla-module-deps.ts` は `node:` import さえ持たない純粋モジュールとする。

## Acceptance

合否は: (1) 推移閉包が `visited` 管理で各モジュールを高々1回読むこと(t402 の注入 stub 呼出回数で実証可能)、(2) 省略モデルのパース結果が byte 不変であること(既存スキーマ表テストの据置き)、(3) 出力がソート・重複排除済みで同一入力に同一であること(t402)、(4) import がゼロ(型 import のみ)であること、の4点で判定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:52:59Z
- **Iteration:** 1
- **Scope decision:** none

All 5 produces exist with house-style headers; NFRs measurable and trace to BR/NFR-1..4; N/A calls evidence-based; patch-coverage 100% and fail-closed explicit. Findings: none.

### Findings

- None
