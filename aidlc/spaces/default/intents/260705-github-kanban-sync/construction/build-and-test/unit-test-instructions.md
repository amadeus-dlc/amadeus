# Unit Test Instructions（260705-github-kanban-sync）

上流入力: [code-summary.md](../u002-kanban-sync-cli/code-generation/code-summary.md)、[business-rules.md](../u002-kanban-sync-cli/functional-design/business-rules.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 対象と実行

| eval | 対象 | 実行 |
|---|---|---|
| kanban-registry | issues 契約（u001） | `npm run test:it:kanban-registry` |
| kanban-sync | scan / 列決定 / GraphQL 引数生成（u002） | `npm run test:it:kanban-sync` |
| kanban-hooks | queue / flush の純関数と搬送（u003） | `npm run test:it:kanban-hooks` |

## 方針

すべて決定論的でネットワークへ接続しない。gh 呼び出し境界の手前（引数生成）までを検証する（Minimal ではなく Standard 戦略だが、暫定機構 C07 により境界外の結合試験は walking skeleton の実機確認に委ねる）。
