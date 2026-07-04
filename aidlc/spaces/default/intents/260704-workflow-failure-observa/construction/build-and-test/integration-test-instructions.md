# Integration Test Instructions

## 入力成果物

この手順は、各 Unit の `code-generation-plan` と `code-summary` を入力に、CLI、hook、audit、doctor、validator の結合を検証する。

Test Strategy は `Comprehensive` である。

## Integration Test Inventory

| Command | 確認対象 |
|---|---|
| `npm run test:it:all` | 既存 eval 群と U001、U002、U003 の追加 eval の連結 |
| `npm run test:it:engine-e2e` | intent-birth、next、report、audit shard、`ERROR_LOGGED` |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260704-workflow-failure-observa` | Intent 成果物と Amadeus DLC 構造 |
| `npm run claude-wiring:check` | Claude harness wiring |

## Run Commands

統合評価は次で実行する。

```bash
npm run test:it:all
npm run test:it:engine-e2e
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260704-workflow-failure-observa
npm run claude-wiring:check
```

## Expected Coverage

`test:it:all` は追加 eval が package script に正しく接続されていることを確認する。

`engine-e2e` は stdout JSON、audit shard、human gate rejection の既存 contract が壊れていないことを確認する。

Validator は `build-and-test` 成果物を含む Intent 構造を確認する。

## Test Data Management

評価は隔離された一時 workspace を使う。

Validator だけは target workspace の Intent 成果物を読む。

Validator は読み取り検証として扱い、workflow state を進めない。
