# Performance Design — u1-runner-relocation

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

u1 は純移設(business-logic-model.md の T1〜T7)であり、実行時性能への影響はゼロが要件(business-rules.md BR-U1-1 の rename 性・I1 挙動不変)。常駐サービス向けの性能機構(cache 等)は導入しない(nfr-design:c1)。

## 性能不変条件

- runner の実行時間・メモリ特性は移設前後で等価(パス解決の深さ変化のみ — bun のモジュール解決は相対 import で O(1) 差)。
- CI ジョブ(ci.yml の formal-model-check)の timeout-minutes: 30 は不変(domain-entities.md E3 の CI 消費点 — 意味論不変の一部)。

## 検証形

性能の専用測定は行わない(NFR-1 の二層検証: 移設は挙動不変クラスで、既存テストの実行時間が回帰の代理指標 — run-tests.sh --ci の既存 timeout 内で green。前後 green+drift check の検証姿勢は **NFR-2** の純移設適用外条項の代替検証に対応)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T20:41:37Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 NOT-READY(Critical: consumes 破綻疑い / Major: NFR-2/5 非明示 / Minor: memory 空)→ Critical は engine の consumes_absent expected:true 機構の実測で却下(reviewer が splitConsumesByPresence :1857-1879 を独立実測し却下を追認)、Major/Minor は NFR 全数表+ラベル+diary 記録で是正。iteration 2 READY(GoA 1)。UTC 2026-07-31T20:41:06Z

### Findings

- iteration1 Critical: consumes 契約破綻疑い — 却下(consumes_absent expected:true = scope 設計上の不在、センサーは実在 consumes のみ照合)
- iteration1 Major: NFR-2/5 の非明示 — NFR 全数表(5/5)+意図的 N/A 宣言で是正
- iteration1 Minor: memory 空 — 記録済み。reviewer スコープ外読取の自己申告も diary 記録
