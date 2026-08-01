# Performance Design — u4-tools-distribution

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 性能予算

compose の tools 配布(business-logic-model.md M2)は宣言分の verbatim コピー+digest 計算(24 ファイル規模)で、既存 stage copy と同じ I/O パターン。一括 compose(M4)は「単一 compose × 現存ツリー数(高々 7)」の直列実行 — 並列化しない(git/FS 共有状態の並行安全性を実測せずに並列化しない: external-cmd-concurrency-safety-doc の教訓を既定で適用)。常駐機構なし(nfr-design:c1)。

## 検証形

専用測定なし(NFR-1: t379 と既存 plugin テスト群の CI timeout 内 green が代理指標)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T21:03:52Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: FD I2(撤回済み trusted-path 記録)の誤帰属)→ ラベル訂正+I2 非該当宣言行で是正、iteration 2 READY(GoA 1-2、1:1 個数照合済み)。UTC 2026-07-31T21:01:37Z

### Findings

- iteration1 Major: I2 の誤帰属(digest 面と混同)— 是正済み(非該当宣言行の追加)
