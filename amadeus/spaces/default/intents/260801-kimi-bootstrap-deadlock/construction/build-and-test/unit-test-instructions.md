# Unit Test Instructions — 260801-kimi-bootstrap-deadlock

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも `../fix-1922-session-start-ordering/code-generation/`)

テスト戦略: **Minimal**(fix scope)。要件駆動の unit pin は既存 twin `tests/unit/t10-hook-session-start.test.ts` の改訂・追加で完結しており、新規テストファイルは作らない(code-generation-plan.md の方針どおり)。

## 実行コマンド

```sh
bun test tests/unit/t10-hook-session-start.test.ts
```

## 結果の読み方

- 期待値: **18 pass / 0 fail / 34 expect() calls / exit 0**。
- pin 内容: no-state SessionStart が `amadeus/.amadeus-sessions/.current-session` に session id を書くこと(改訂 `.sh` test 1)、heartbeat・audit 不発(同 test 2)、state file 有りでは従来どおり SESSION_STARTED が発火し `.current-session` も書かれること(新規ケース (b))、ほか意味不変 pin 14 件。
- 失敗時は先に `bun scripts/package.ts --check` で dist drift を疑う(hook は `.claude/` 等の配布コピーに対して spawn されるため、再生成漏れで pin が RED になる)。

## 横断 unit 検証

```sh
bun run test:ci   # smoke+unit+integration。本 intent では tests/run-tests.sh --ci を実行(結果は build-test-results.md)
```
