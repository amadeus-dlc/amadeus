# Unit Test 手順 — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## 対象とデータ

- `tests/unit/t245-amadeus-leader-sync.test.ts` の 12 ケースを対象とする。
- transient election、所有 shard、除外違反、marker、JSON、append-only、閾値、全 `SyncError` discriminator を独立 fixture で検証する。

## 実行と期待値

- 実行: `bun test tests/unit/t245-amadeus-leader-sync.test.ts`
- 期待: 12 pass、0 fail。手動準備・共有可変状態は不要。
- 境界: invalid/surplus argv、他メンバー snapshot、memory touch、foreign modify、malformed numstat を fail-closed にする。

## Coverage

- unit と integration の合算で `scripts/amadeus-leader-sync.ts` の実行可能行を全到達させる。
- 数値だけでなく、空 pathset が Git を呼ばない interaction assertion を荷重証拠とする。
