# Performance Design — U3 ci-slim

上流入力(consumes 全数): business-logic-model.md(U3 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-3/AC-3 と FD の照合ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 性能効果(削除による)

- business-logic-model.md ロジック1 の3 job 削除で、full PR ごとのランナー消費が benchmark 4 job 分(実測 各 0.2-0.3min + キュー待ち)減少
- PR クリティカルパスへの影響: 削除3 job は ci-success needs 非掲載のためクリティカルパス長は不変 — 効果はランナー枠の解放(並行 PR 時のキュー短縮)

## 測定

- NFR-1 非退行層の wall-clock 記録は U4 で確定(本 Unit は削除のみで tests job に無影響)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:37:20Z
- **Iteration:** 1
- **Scope decision:** none

削除3 job の needs 非掲載・4 hit 全削除区間内・V 対照・BR-U3-3 着地順・不在扱いの開示を live repo で照合し全一致。dead-config 残置拒否も確認。READY。

### Findings

- None
