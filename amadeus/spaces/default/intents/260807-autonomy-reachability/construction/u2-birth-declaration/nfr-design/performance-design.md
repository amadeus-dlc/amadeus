# Performance Design — u2-birth-declaration

上流入力(consumes 全数): business-logic-model.md(birth 同時宣言フロー)。nfr-requirements 系5成果物は self-feature スコープで nfr-requirements SKIP のため未生成(設計どおりの不在)。

## 性能設計

- 追加処理は judgment の分岐1つ・birth directive への引数付与・intent-birth 内の canonical 適用1回(u1 と同一機構) — birth 全体(state 生成+mirror 準備)に対し無視できる増分
- ask 経路の loud 拒否は即時 error directive — 待機・リトライなし
- 常駐サービス機構は適用外(cid:nfr-design:c1)

## 予算の非対象

負荷試験・数値目標なし(承認済み NFR に性能目標が存在しない — bt-proportional-selection)。e2e(FR-1d)の実行時間は既存 integration 予算(per-test 30s)内。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T21:56:35Z
- **Iteration:** 1
- **Scope decision:** none

セキュリティ不変4点・失敗様式4行・post-ruling 一貫性・層別保証を確認。NIT 1(u2 FD の Review 記録が Iteration 1 NOT-READY のまま — 本文は是正済み。E-LSSADS13 受理は FD 全体ゲートで申告・承認済みで diary に記録済み)

### Findings

- NIT | u2 FD business-logic-model.md:55-69 — Review 記録が Iteration 1 NOT-READY のまま(本文是正済み・FD ゲートで E-LSSADS13 受理を申告済み)— record 整理で解消推奨
