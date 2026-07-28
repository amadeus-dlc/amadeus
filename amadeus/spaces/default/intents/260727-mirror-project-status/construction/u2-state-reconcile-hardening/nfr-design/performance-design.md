# Performance Design — u2-state-reconcile-hardening

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

performance-requirements の「reconcile の追加コストゼロ」を、business-logic-model の reconcile ループの分岐配置で実現する設計。キャッシュ・非同期・プール等は非適用(performance-requirements の非目標 — cid:nfr-design:c1)。

## reconcile の呼び出しコスト設計

- **一律再分類の単一経路**: 再評価は状態別の特別経路を持たず、全 Project が同じ per-Project 手順を通る(business-logic-model 手順2 — 状態別の追加照会を作らない構造で performance-requirements の「同一予算内」を保証)。
- **synced の早期 skip**: 台帳が synced かつ期待一致の Project は mutation を発行しない(business-logic-model 手順4 の冪等 reconcile)— 二重実行の追加コストは照会のみで、mutation 総数は不変(performance-requirements の検証契約)。
- **所属照会の一括性維持**: 対象集合の構成(business-logic-model 手順1)は boundary 冒頭の一括照会1回の結果を共有 — reconcile が per-Project の所属再照会を追加しない。

## 検証シームの設計

- FakeGateway history による per-Project counter assert(performance-requirements — 照会1+mutation≤2 の設計値)と、二重実行での mutation 総数不変 assert(reliability-requirements の冪等検証)を同一の history 検査面に載せる。秘匿制約(security-requirements)により検査対象はメソッド名・回数のみ。

## 実行時間の境界

- gh サブプロセスの deadline/stdout cap は既存 profile(performance-requirements の実装直読: amadeus-mirror-runner.ts:29)を消費 — U2 で profile 追加・throttle 導入をしない(tech-stack-decisions の boundary 駆動リトライ決定と整合: 待機・バックオフの時間コスト自体を持たない)。

## 非目標

- レイテンシ SLO・負荷試験: N/A(performance-requirements の非目標 — 常駐サービスなし。scalability-requirements の線形モデルが規模面の唯一の変数)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T10:47:20Z
- **Iteration:** 1
- **Scope decision:** none

consumes 6件の全実参照・機構引用3点の裏取り一致・責務境界維持・5成果物の内部整合を実測確認。指摘なし。

### Findings

- None
