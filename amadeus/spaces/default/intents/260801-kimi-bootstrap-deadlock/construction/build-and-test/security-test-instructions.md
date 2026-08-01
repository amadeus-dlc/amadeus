# Security Test Instructions — 260801-kimi-bootstrap-deadlock

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも `../fix-1922-session-start-ordering/code-generation/`)

## 適用外の理由

- 本変更は認証・認可・入力検証の各ロジック自体には触れていない。`writeCurrentSessionId` の呼び出し位置の移動のみで、writer 本体・kimi caller-authorization・`isTrustedMainStop` の判定ロジックは無変更(code-summary.md FR-2: heartbeat/audit/context injection はガード後段に維持)。
- 関連する fail-closed 契約(reader が `.current-session` 不在時に fail-closed する性質、NFR-2)は t10 の既存 pin と caller-authorization 系の既存スイートがカバーしており、新規のセキュリティテストを発明しない(Minimal 戦略)。
- SAST 相当は `bun run lint`(Biome)が常設で、本変更ファイルへの新規指摘はなし(実測は build-test-results.md)。

## 代替となる既存カバレッジ

- `tests/unit/t10-hook-session-start.test.ts`: no-state 経路で heartbeat・audit が発火しないこと(情報流出・副作用の非発生)を pin。
- `bash tests/run-tests.sh --ci` 内の caller-authorization / session lifecycle 系スイート: fail-closed 判定の回帰検出。
- 依存監査は本 intent の範囲外(project.md Testing Posture: 対象変更の security regression と repository 全体の dependency audit は別判定)。
