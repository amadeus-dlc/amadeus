# Delivery Planning — 質問(intent 260816-priority-bug-batch-3)

> 裁定承認: 戦略回答と Bolt 順序は Intent Autonomy Mode = full の decide-question 梯子で AUTO_DECIDED(q-dp-sequencing、2026-08-17T02:12:03Z の INTENT_AUTONOMY_TRANSACTION_COMMITTED、grant `intent-grant-ca040a2aad2575a37bc7452bfb9afa6a`)。前提は units-generation の DAG と decisions.md ADR-1〜5。

## Q1: 順序ヒューリスティック

A. 優先度キュー順 + 依存制約 + 同一ファイル直列化(bug-zero ノルムの機械適用) / B. risk-first / C. value-first / D. walking-skeleton-first / X. Other

[Answer]: A — cid:requirements-analysis:bug-zero-goal の機械適用(P1 チェーン先行、park 解除の時間価値は P2 内の順序付けに使用)。WSJF スコアリングは不使用(5 unit の小規模バッチで優先度・依存が一意に順序を定めるため)。

## Q2: Bolt 粒度

A. 1 Unit = 1 Bolt / B. 関連 Unit の束ね / X. Other

[Answer]: A — intent 発注文「1 Issue = 1 Unit = 1 PR」+ norm(PR 粒度は Bolt ごと既定、複数 Unit を単一 PR に束ねない)。

## Q3: Bolt の並行実行

A. 実装は並行可(交差なしレーンのみ)、着地は直列 / B. 厳密直列 / X. Other

[Answer]: A — prc-finalization / election-append は amadeus-state.ts 群と write scope 交差なし(unit-of-work-dependency.md)。着地は record 同梱 PR の構造的競合により直列(cid:pr-convergence:serial-landing-rebase-shape)。

## Q4: 外部依存と walking skeleton

外部依存: A. GitHub(PR 作成・merge queue・CI)のみ — 常設・リードタイム CI 実行時間のみ。 walking skeleton: A. スキップ(スコープ既定) / B. 実施。 / X. Other

[Answer]: 外部依存 = A、walking skeleton = A(スキップ) — external-dependency-map.md に詳細、外部チーム・API 承認・データ待ちは存在しない。org.md Walking Skeleton 節: bugfix 系(self-fix)はスケルトンのセレモニーをスキップ。State の Skeleton Stance = scope-dependent → スコープ既定でオフ。

## 曖昧性分析

回答に矛盾なし。Bolt 順序が 2.7 のトポロジカル順(U3→U4 のみ制約)に違反する点はない(逸脱なし — risk-and-sequencing-rationale.md 参照)。
