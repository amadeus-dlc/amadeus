# Performance Design — U2 u2-install-verb

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計

PR-U2-1(performance-requirements.md — 予算なし・実測3ファイル規模)の実現 = 素朴な同期コピー+O(1) rename(business-logic-model.md Step 3)。ストリーミング・並列コピー等を導入しない(tech-stack-decisions.md TS-U2-1 の追加依存なし)。

## 境界確認

- identical 判定(scalability-requirements.md SC-U2-1)は全走査のまま — 最適化キャッシュを持ち込まない
- swap の退避 rename(reliability-requirements.md RL-U2-1)も O(1) で性能面の追加コストなし
- symlink lstat 判定(security-requirements.md SR-U2-2)はコピー走査に内包され追加パスなし

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T23:10:00Z
- **Iteration:** 2
- **Scope decision:** none

it.1 の Major(`..`/絶対パス拒否の無申告新規契約 → 敷衍申告+実施箇所を handleInstall Step 1 に一意化)/ Minor(parseInstall の SR 誤対応 → 所有関係の訂正)を閉包。残存なし。

### Findings

- None
