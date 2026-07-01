# Domain Map

## Subdomains

| 識別子 | 名前 | 種別 | 役割 | 状態 | 根拠 |
|---|---|---|---|---|---|
| SD001 | 自己開発運用 | 支援 | Amadeus 本体の自己開発 cycle、stage 判定、workspace 対応記録を扱う。 | adopted | [D002](intents/20260701-self-development-cycle-stage-workspace/inception/decisions/D002-bc001-self-development-governance.md) |

## Bounded Contexts

| 識別子 | 名前 | サブドメイン | 役割 | 状態 | 根拠 |
|---|---|---|---|---|---|
| BC001 | 自己開発運用 | SD001 | stage 判定、stage0 採用判断、build workspace / target workspace 対応記録を一貫して扱う。 | adopted | [D002](intents/20260701-self-development-cycle-stage-workspace/inception/decisions/D002-bc001-self-development-governance.md) |
