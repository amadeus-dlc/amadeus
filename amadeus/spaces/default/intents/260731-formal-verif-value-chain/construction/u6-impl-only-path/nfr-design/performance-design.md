# Performance Design — u6-impl-only-path

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 性能予算

--impl-only 分岐(business-logic-model.md P1)は既存 check 経路の evaluateEntries(全 entries の hash 再計算 — 現状 5 エントリ)+diffModelMap の再利用で、既存 updateModelMap と同オーダー。deadline 配管(P6)は既存 DEFAULT_DEADLINE_MS を再利用し新規のタイムアウト方針を作らない。常駐機構なし(nfr-design:c1)。

## 検証形

専用測定なし(NFR-1: t380 の CI timeout 内 green が代理指標)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T21:09:20Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: domain-entities の装飾トークン)→ E1〜E4 の実参照+下流消費節で是正、iteration 2 READY(GoA 1-2、逐語照合5箇所一致)。UTC 2026-07-31T21:08:43Z

### Findings

- iteration1 Major: domain-entities のヘッダ宣言が本文未参照 — E1〜E4 実参照化で是正
