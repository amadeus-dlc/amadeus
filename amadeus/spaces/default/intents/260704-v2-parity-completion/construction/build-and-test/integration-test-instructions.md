# Integration Test Instructions

1. sandbox 統合テスト（B001）: scratchpad の隔離環境でエンジン全周（intent-birth → next → report の決定論ガード 2 種 → audit shard 生成）を確認する。手順は `construction/bolts/B001-walking-skeleton/integration-test-instructions.md`。
2. dogfooding（B004）: 本 Intent の record に対して park → unpark → next --resume → run-stage directive（本ファイル群の生成）→ report completed をエンジン駆動で実行する。エンジンの記録は `audit/j5ik2o-*.md` shard を参照する。
