# Risk & Sequencing Rationale — installer-distribution

> ステージ: delivery-planning (2.8) / 作成: 2026-07-08
> 出典: `bolt-plan.md`、`../units-generation/unit-of-work-dependency.md`、feasibility RAID(R4)

## 採用ヒューリスティック

**walking-skeleton-first(Cockburn)+ 以後はトポロジカル順**。

1. **skeleton-first の根拠**: team.md の Walking Skeleton 規定(最小の `@amadeus-dlc/setup` 実行経路を最初に通しゲートする)が既に確約されたプラクティスであること。加えて R4(非破壊マージ・差分レポートの工数リスク)の強化緩和策「skeleton での早期実測」を実装する — 最大の技術リスク(取得→展開→検証の縦ライン成立性)を Bolt 1 で潰す
2. **以後トポロジカル順の根拠**: units-generation Q2 で直列 DAG(U3 が U2 の planner/applier 基盤を再利用)を確定済み。順序の自由度が実質存在しないため、WSJF/CD3 のスコアリングは判断を変えず儀式化する — 不採用(理由付きで省略)
3. **トポロジカル順からの逸脱**: なし(Bolt 1 が U1/U2 を跨ぐのは粒度の決定であり順序の逸脱ではない)

## リスク先行対応表

| リスク | 対応 Bolt | 手段 |
|--------|-----------|------|
| R4: マージ実装工数 | Bolt 1 | 縦スライスで実測。超過が見えたらリリース分割(v1=install)へ切替 |
| R3: バージョン整合 | Bolt 1〜2 | resolver を最初に実装し FR-006 の解決規約をテストで固定 |
| R2: ネットワーク依存 | Bolt 2 | エラー分類+リトライを install 完全版で実装(モック+実測二層) |
| R1: npm スコープ | Bolt 4(最終段のみ) | 人間の公開前タスク。ブロック範囲を publish 検証に限定 |
