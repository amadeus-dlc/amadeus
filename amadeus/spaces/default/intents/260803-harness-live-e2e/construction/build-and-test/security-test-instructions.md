# Security Test Instructions

## 上流成果物と脅威面

各 `code-generation-plan.md` / `code-summary.md` のsecurity境界を検証する。主対象はambient secret/source pathの情報開示、GHA上の意図しない課金実行、credential再利用、user config/hooks混入、process/tmux残留、raw evidence永続化である。

## 実行方法

```bash
bun test \
  tests/unit/t-codex-exec-live-gate.test.ts \
  tests/unit/t-claude-print-live-gate.test.ts \
  tests/unit/t-claude-sdk-live-gate.test.ts \
  tests/unit/t-claude-tui-live-gate.test.ts \
  tests/unit/t-live-e2e-hardening-kit.test.ts \
  tests/integration/t-live-e2e-codex.integration.test.ts \
  tests/integration/t-live-e2e-claude-print.integration.test.ts \
  tests/integration/t-live-e2e-claude-sdk.integration.test.ts \
  tests/integration/t-live-e2e-claude-tui.integration.test.ts
```

依存・静的面は次の既存gateで確認する。

```bash
bun run lint
bun scripts/package.ts --check
```

## 合格基準

- `GITHUB_ACTIONS=true`がすべてのopt-inより優先される
- child envはallow-listとrun-bound credentialだけ
- source `HOME`、auth/config、user/local settings、hooksをcopy/link/mergeしない
- SDK credential frameはone-shot、TUIはrun-private `tmux -S`のみ
- cleanup/leak/retained resourceをPASSやsupportedへ昇格しない
- secret/source path/raw prompt/full outputをledger・matrix・diagnosticへ残さない

## DASTとIaC

HTTP service、container、IaCを追加しないためDAST、image scan、IaC scanは非適用。外部CLI境界はfake executableとstrict live gateで検証する。
