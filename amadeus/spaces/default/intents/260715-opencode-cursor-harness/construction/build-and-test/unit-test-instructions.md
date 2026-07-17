# Unit Test Instructions — 260715-opencode-cursor-harness

上流入力(consumes 全数): 各 unit の code-generation-plan.md(テスト設計の実行形態)と code-summary.md(実測記録)— U1〜U4。

## 対象と実行

- `bun test tests/integration/t-opencode-emit.test.ts` — opencode emit の write⇔check 対称(MISSING/DIFFERS 両分岐を in-process 駆動、U1 骨格+U2 拡張ケース)
- `bun test tests/integration/t-cursor-adapter.test.ts` — cursor adapter/lib 37 tests(exit 値アサート、ToolNameMap、advisory 拒否、stop の advisory 化)
- seam 設計: adapter は import 可能な lib(100% 被覆)と runnable thin entrypoint(テスト非 import)に分割 — bun-coverage-spawn-blindspot 回避(codex 前例)

## 検証済み(実測)

すべて green(build-test-results.md の表参照)。実装に依らず常にパスするテストなし — 落ちる実証で赤経路を確認済み(U1 は赤経路をテストに恒久化)。
