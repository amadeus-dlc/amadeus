# Performance Design — u3-boundary-guard

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 性能予算

t377 は integration 層の1テスト(business-logic-model.md のテスト設計)で、検査は4面のファイル走査+grep 相当(G1/G2)。走査対象は plugin 配布面のみ(数十〜百ファイル規模)で、既存 t258(同型の SCAN_ROOTS 走査 — business-rules.md BR-U3-2 の引用面)と同オーダー。CI プロファイルへの実行時間影響は既存 boundary guard 同等(nfr-design:c1 — 常駐機構なし)。

## 検証形

専用測定なし(NFR-1: 既存 CI の timeout 内 green が代理指標)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T20:58:40Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Major: 表見出しの 1:1 claim に対し I3 が表外)→ I3 行追加+見出し精密化で是正、iteration 2 READY(GoA 1-2)。UTC 2026-08-01(reviewer 環境で date 不能につき conductor 記録)

### Findings

- iteration1 Major: I3(integration 層配置)の表外漏出 — 是正済み(fs-tests-integration-first 根拠の行を追加)
