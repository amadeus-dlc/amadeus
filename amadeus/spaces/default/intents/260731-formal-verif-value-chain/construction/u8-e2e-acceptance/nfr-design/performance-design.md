# Performance Design — u8-e2e-acceptance

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 性能予算

検証専用 Unit(business-logic-model.md S1〜S3)で新規実行機構を持たない — 実測は既存機構(next・formal-model-check ステージ・TLC ジョブ)の実行そのもの。所要時間は S3 の TLC 実行(u7 の 30 分 timeout 面)が支配項で、u8 固有の性能設計対象なし(nfr-design:c1)。

## 検証形

該当なし(u8 の成果は実測記録 — domain-entities.md E1)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T21:22:06Z
- **Iteration:** 1
- **Scope decision:** none

iteration 1 READY(GoA 1)。NFR 全数表・I1〜I3 カバー・セレモニー抑制・引用実在すべて実測確認。Minor(depends_on の保証層の混同 — 成果物順序 vs マージ着地)は層別化の書き直しで即時反映済み。UTC 2026-07-31T21:20:59Z

### Findings

- Minor(PLAUSIBLE): edge block の保証層混同 — 2層(engine 成果物順序/人間承認のマージ着地)へ層別化して是正済み
