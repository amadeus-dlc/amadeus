# 性能要件 — U7 conformance-suite

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 性能モデルと CI 時間の実測

U7 は上流 t188 の 32 ケースを既存 `tests/run-tests.sh` の 4 層(smoke/unit/integration/e2e)へ編入する適合スイートである(`business-logic-model.md` フロー 3)。`technology-stack.md` 実測どおりテスト実行は既存ランナーの単発実行であり、性能上の関心は **CI 実行時間への増分**のみである。`requirements.md` FR-8 合否は「CI 時間の増分が計測される」ことを明示的に要求し、`business-rules.md` BR-U7-6(CI 時間)がこれを担保する。

## PERF-U7-1: CI 時間増分の実測転記(BR-U7-6)

`business-rules.md` BR-U7-6 と `business-logic-model.md` フロー 3 のとおり、編入前後の CI 実行時間をコマンド出力で計測し、増分を成果物へ転記する(numbers-from-command-output-only — 計測コマンド併記)。数値の固定は実装時(build-and-test)に行い、未実測の推定を受け入れ基準にしない。

- 合否: 編入前後の CI 実行時間を計測し、増分を計測コマンドの出力とともに成果物へ転記する(`business-rules.md` BR-U7-6 検証)。具体的な増分数値は build-and-test の実測で固定する(現時点で数値を基準化しない — `technology-stack.md` の未判定値を基準化しない前例に倣う)
- 合否: テストの二重実装を避けることで CI 時間増分を抑える(`business-rules.md` BR-U7-3 層別 — compose-semantics 層は 1 回実行、per-harness 層は U2-U6 の BR 検証テストと共有し追跡表から参照)

## PERF-U7-2: e2e 層の CI 除外前提

`technology-stack.md` 実測(履歴「e2e 層は `--ci` 非対象のため自動 CI で走らない」)のとおり、per-harness の native hook 実起動を e2e 層へ置く場合、その面は日常 CI の時間増分に含まれない。CI 時間計測は `--ci` 対象層(smoke/unit/integration)を対象とする。

- 合否: CI 時間計測の対象層を明示し、e2e 層に置いた実起動テストは日常 CI 増分の対象外である旨を成果物に記録する(計測範囲の明確化)

## 非該当カテゴリ(N/A + 根拠)

- レイテンシ SLO / スループット / 同時接続: N/A。U7 はテストスイートで常駐 service ではない(technology-stack.md「HTTP・DB はない」実測)。性能は CI 実行時間の決定的計測へ置換される
- 負荷試験 / auto-scaling: N/A。適合スイートは CI で単発実行され、承認済み NFR に負荷試験対象の service が存在しない(project.md bt-proportional-selection — 戦略名だけで負荷試験を機械追加しない)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:53:40Z
- **Iteration:** 1
- **Scope decision:** none

BR-U7-1〜8 の配分・引用・pin・数値委譲は整合。Minor 1: SEC-U7-1 の scratch-script-discipline 引用が project.md へ誤帰属(実在は team.md)— 1 語置換の是正が必要。

### Findings

- [Minor] security-requirements SEC-U7-1 の cid 引用元誤帰属(project.md→team.md)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:54:24Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Minor(引用誤帰属)は team.md+cid 併記へ是正済み(team.md:144 の cid 実在を grep 実測)。新規指摘なし。

### Findings

- None
