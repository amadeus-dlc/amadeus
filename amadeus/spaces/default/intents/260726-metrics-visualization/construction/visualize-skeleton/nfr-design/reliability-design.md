# Reliability Design — U1 visualize-skeleton

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U1-REL-01(zero-write)の実現: 描画・書込より前に全件検証を完了する順序(business-logic-model.md ステップ4 → 6 → 7)。書込は最後の1箇所のみ — 部分生成状態が構造的に存在しない
- U1-REL-02(原因列挙)の実現: ParseOutcome の error 集約を stderr へ全件出力(最初の1件で打ち切らない — 一括修復可能性のため)後に exit 1
- U1-REL-03(決定性)の実現: wall-clock・乱数・env 値の出力禁止(FD ルール11)。入力ソートは readdir 順でなくファイル名 sort(business-logic-model.md ステップ3)+buildSeries の captured_at/commit 順 — OS 依存の順序不定性を排除
- U1-REL-04(既存非破壊)の実現: R-1 は export 追加のみ(performance-requirements.md U1-PERF-02 の走査構造にも影響なし)。Bolt 1 冒頭に t230/t231 ベースライン green の実測手順を置く(tech-stack-decisions.md の既存ランナー)

## 非対象

- リトライ・部分回復(reliability-requirements.md 非対象 — 冪等再実行が回復手段)
