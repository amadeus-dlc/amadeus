# Performance Test Instructions — fix-2143-phase-boundary-approval

## 適用判定

本 Bolt は protocol/annex 文言・テスト・単一 CLI サブコマンド(`record`)の追加であり、ホットパス(engine の next/report ループ、audit append)への変更はない。専用の性能テストは **N/A**(反証: `verifyPhaseCheckArtifact` と approve 経路は C-1 で不変、`record` は人間対話頻度でのみ呼ばれる)。

## 退行監視

既存の perf tier(`tests/perf/`)は blocking CI 外で継続実行される。complexity gate は 0 new violations(実測 exit 0)。
