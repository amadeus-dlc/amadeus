# 統合テスト手順

各 Unit の `code-generation-plan.md` と `code-summary.md` が定義する、実 filesystem・subprocess・配布境界を検証する。

## 実行方法

```bash
bun test tests/integration/t258-boundary-guard.integration.test.ts
bun test tests/integration/t236-election-loop.integration.test.ts
bun test tests/integration/t240-election-transport.integration.test.ts
bun test tests/integration/t242-election-skill-vocabulary.integration.test.ts
bun test tests/integration/t266-team-launcher-prerequisites.test.ts
bun test tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts
```

## 期待する境界

- promoted core と旧 `scripts/` / `contrib/` の相互排他
- 全6 harness の tool 配布、Claude/Codex の election skill 配布
- team-up → team-msg → election の clean HOME/PATH journey
- herdr/agmsg/unsupported OS の副作用なし fail-fast
- election transport の実 spawn と directive loop 完走

## 環境とデータ管理

E2E は temp HOME、隔離 PATH、配布コピー、fake herdr/agmsg/uname をケースごとに生成・削除する。同一 worktree で full CI を重複実行しない。
