# Integration Test Instructions — s13-label-clarity

- リグレッションピン: `tests/smoke/t86-stage-protocol-section-13.test.ts` の新 assertion(否定例文字列 `Persist c5 only` の存在検査 — 削除注入で赤の実証済み)
- 専用ファミリ実行: `bun test tests/smoke/t86-* tests/integration/t3{4,5,6,7}-stage-protocol-*`(201 tests)
