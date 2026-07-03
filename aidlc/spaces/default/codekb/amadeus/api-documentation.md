# API：amadeus

## 公開入口

Amadeus の公開入口は HTTP API ではなく、skill と CLI である。

| 入口 | 形式 | 契約 |
|---|---|---|
| `amadeus` | skill | Intake、Initialization、stage routing、phase 境界、Construction の Bolt 実行。 |
| `amadeus-steering` | skill | Space の初期化、点検、補修。 |
| `amadeus-event-storming` | skill | Event Storming 成果物の作成または補修。 |
| `amadeus-grilling` | skill | 設計論点を一問ずつ確認する。 |
| `amadeus-domain-modeling` | skill | Domain Map、Context Map、Glossary などを補修する。 |
| `amadeus-domain-grilling` | skill | 用語、境界、モデルを質問で確認し、成果物へ記録する。 |
| `amadeus-validator` | skill | 配布先ユーザー環境で Amadeus DLC 成果物を検証する。 |

## CLI 入口

| コマンド | 役割 |
|---|---|
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace> [<intent-dirName>]` | Space または Intent の構造を検証する。 |
| `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace> [--check]` | `intents.md` の生成または整合検査を行う。 |
| `npm run test:all` | CI と同等の mock 検証を実行する。 |
| `npm run contracts:check` | skill contract 生成物の整合を検査する。 |
| `npm run claude-wiring:check` | `.claude/` と `.agents/` の接続を検査する。 |
| `npm run test:examples` | examples snapshot と provenance を検査する。 |

## 内部入口

stage 内部 skill は、単一入口 `amadeus` から呼ばれる前提である。

内部 skill は対象 stage の成果物だけを作成し、phase 境界処理や別 stage の成果物作成は行わない。
