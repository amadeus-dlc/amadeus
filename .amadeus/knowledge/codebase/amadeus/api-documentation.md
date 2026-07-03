# API：amadeus

## 公開 API

Amadeus の公開インターフェイスは HTTP API ではなく、skill 入口とコマンド入口である。

| 入口 | 形式 | 契約 |
|---|---|---|
| `amadeus` | skill | Intake（合流既定、Birth 提案）とステージルーティング。 |
| `amadeus-steering` | skill | steering layer の初期化、点検、補修。 |
| `amadeus-event-storming`、`amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-domain-grilling` | skill | 補助入口。 |
| `amadeus-validator` | skill | 実行時構造検証の入口。 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace> [<intent-id>-<slug>]` | CLI | 検証。exit 0 = pass、1 = fail。日本語 Markdown の検査台帳を出力。 |
| `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace> [--check]` | CLI | `intents.md` の再生成と整合検査。 |

## 内部 API

- ステージ内部 skill（22 個）: `amadeus` 入口のルーティングからだけ呼ばれる。Codex metadata（`agents/openai.yaml`）で暗黙起動を禁止している。
- `dev-scripts/promote-skill.ts <skill> [--replace] [--dry-run]`: source → 昇格先の同期。
- `npm run` scripts: `test:all`（CI 入口）、`test:examples`、`validate:all`、`examples:generate:real`、`contracts:generate` / `contracts:check`。
- `dev-scripts/examples-contract.ts` の export: `exampleIntentId`、`exampleSnapshots`、`snapshotInvariants`、`checkSnapshotInvariant`、`matchExists`、`invariantForSnapshot`。generator と wrapper が共有する。
- `lifecycle-v2.ts` の export: `checkLifecycleV2Intent(ctx, input)`。validator 本体から呼ばれ、pass / failRow / checkFile の 3 関数だけに依存する。
