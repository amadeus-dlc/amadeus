# Performance Design — u7-mirror-model

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 性能予算(TLC 探索)

- AsIntended 変種(business-logic-model.md T3 の CI 統合契約 — model-map 登録・恒常 green 対象)の状態空間は ADR-3 縮約(MaxReceipts=3・boundary 4種・14 遷移 — T2)で有界。既存 CI ジョブの timeout-minutes: 30(.github/workflows/ci.yml:549 の formal-model-check job — business-rules.md BR-U7-5 の workflow_dispatch 面)内での完全探索完走が AC(business-logic-model.md I1 — 完走しない場合は縮約強化+消える性質の明記で対処: 早期の縮約約束はしない)。
- 日常 CI 面のコード(v2 スキーマ・移行・drift 検出 — テスト設計)は既存 formal-verif テストと同オーダー。常駐機構なし(nfr-design:c1)。

## 検証形

TLC 完走の completion marker+state 統計が性能面の実測そのもの(finite-exploration-not-detected-proof — 部分探索を成功に丸めない)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T21:15:31Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: timeout の帰属先誤引用)→ ci.yml:549+BR-U7-5 へ差し替えで是正、iteration 2 READY(GoA 1-2)。UTC 2026-07-31T21:15:04Z

### Findings

- iteration1 Major: timeout-minutes の E1 誤帰属 — ci.yml:549 へ是正
