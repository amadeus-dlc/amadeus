# Integration Test Instructions — 260801-kimi-bootstrap-deadlock

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも `../fix-1922-session-start-ordering/code-generation/`)

## 適用範囲

Minimal 戦略(fix scope)では integration テストの新規作成は対象外。本変更は SessionStart hook 内の書き込み順序のみであり、外部境界(CLI 契約・配布物・セルフインストール互換)を変えない。ただし Testing Posture(project.md)の「ユーザー可視の契約は該当領域を触る変更で必ずカバーする」に従い、hook・caller-authorization・session lifecycle を横断する既存 integration スイートを full runner 経由で再検証する。

## 実行コマンド

```sh
bash tests/run-tests.sh --ci
```

## 結果の読み方

- 末尾サマリが `RESULT: PASS` かつ exit 0 で合格。
- 既知の注意(AGENTS.md): 重い integration ファイル(t227-codex-migration-walking-skeleton、t-codex-hooks-ownership、t-codex-hooks-migration、t-team-up-codex-resume)は cold run で per-test timeout に当たることがある。これらが timeout のみで落ちた場合は `bun test --timeout 120000 <file>` で単独再実行して判定する(実害ではない flaky)。
- 本 intent での実測値は `build-test-results.md` を参照。
