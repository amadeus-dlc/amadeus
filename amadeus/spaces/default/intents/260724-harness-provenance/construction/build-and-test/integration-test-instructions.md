# Integration Test Instructions — harness-provenance

上流入力: `harness-provenance/code-generation/code-generation-plan.md`, `harness-provenance/code-generation/code-summary.md`

## 対象境界

`tests/integration/t269-harness-provenance.cli.test.ts` と `tests/integration/t270-harness-provenance-birth.test.ts` で、detector → intent birth → V7 state → diary observation → 配布形態の境界を検証する。

- 7値override、空・不正値の後段遮断
- env / script-path / CWD probe / fallback と non-env cache
- 新規 state の `Harness` exactly once と既存 field helper
- Harness なし/あり V7 の後方互換
- invalid override の state/memory/audit/stdout/stderr 5面 raw leak 防止
- detector exactly once と同期ローカル判定
- Claude Code / Codex / Cursor / OpenCode / Kiro CLI / Kiro IDE の6配布形態
- 競合 CWD dot-dir より script-path が優先される AC-3d

## 実行

```bash
bun test \
  tests/integration/t269-harness-provenance.cli.test.ts \
  tests/integration/t270-harness-provenance-birth.test.ts
```

全リポジトリの回帰は次で実行する。

```bash
bun run test:ci
```

## 成功条件とcoverage

- focused integration と CI profile が failure 0。
- fixture は fresh subprocess / fresh temp directory で独立する。
- 3つの override env を明示的に制御し、親processの環境に依存しない。
- state と diary の構造、raw leak 不在、6配布形態の期待値を assertion で直接検証する。

## 環境とcleanup

外部serviceは不要。テストは repository内の配布物と一時projectだけを使い、終了時に一時ディレクトリを削除する。
