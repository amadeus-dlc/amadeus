# Performance Design — boundary-guard

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- performance-requirements の「専用目標なし・既存 CI 予算内」を実現する構造: business-logic-model の層分割どおり、重い FS 走査は integration 層の1テスト1パスに限定し、unit 層は入力データ駆動の純関数のみ(走査の重複実行を構造排除)
- tech-stack-decisions の配置(unit/integration)がそのまま性能設計 — 追加機構なし

## 検証設計

- performance-requirements の検証(ランナー wall-clock 機械比較+record 転記)を build-and-test 段の定型に含める

## 他 NFR との整合

- security-requirements の substring 設計は走査コストの上限も抑える(regex バックトラック排除)— 性能面の副次根拠
- reliability-requirements の corpus sweep(導入時1回)と scalability-requirements の roots 拡張時再実測は、いずれも定常 CI に載らない一回性の走査として性能予算と両立

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T04:13:01Z
- **Iteration:** 1
- **Scope decision:** none

全6 consumes 実参照・設計具体化・整合節実質・tests/側一貫・誤帰属なし・一枚岩断定なし。Minor2件(allowlist 永続先の粒度/performance の反復度)は次工程を止めない

### Findings

- None
