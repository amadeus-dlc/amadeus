# Performance Requirements — solo-election-surface (U2)

上流入力(consumes 全数): business-logic-model.md(ソロ手順・降格・ノルム改定の論理)、business-rules.md(BR-U2-1〜8 の検証列)、requirements.md(FR-02/04/08〜13・NFR-01〜03 の正本)、technology-stack.md(SKILL/dist 投影の実行環境)。

## 性能要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U2-PERF-01 | SKILL 内挿・team.md 改定は prose のみで実行時性能に影響しない(TS 変更ゼロ) | 実装 diff に .ts 変更ゼロ(テスト追加を除く — grep/diff 機械確認) | business-logic-model.md、requirements.md FR-11 |
| U2-PERF-02 | 選挙1回あたりの subagent コスト上限は2体分のコールドスタート(発動条件で制御 — 3類型+明示のみ) | SKILL 起動節の発動類型記述と team.md の同文性(BR-U2-5 の grep 照合) | requirements.md FR-09、C-07 |

## 明示的に設けない検査(比例選定)

トークンコストの自動計測は設けない — 承認済み NFR に定量コスト要件が存在しない(cid:build-and-test:bt-proportional-selection)。コスト制御は発動条件(定性)で行い、実績評価は運用後の PM に委ねる(intent-backlog の再裁定候補)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:29:28Z
- **Iteration:** 1
- **Scope decision:** none

引用捏造ゼロ(前 unit の誤帰属型の再発なし)・cid 使い分け適正・全13基準が機械確認可能・BR 1:1 対応・テンプレ変数記述は FD 是正後の正文と一致。Minor 2件(ゲート trace 明示)は conductor が即時追記。

### Findings

- None
