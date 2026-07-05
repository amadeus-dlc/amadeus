# コンポーネント一覧：amadeus

## 一覧

| コンポーネント | 場所 | 責務 |
|---|---|---|
| 単一入口 `amadeus` | `skills/amadeus/`、`.agents/skills/amadeus/` | forwarding loop の conductor。routing はエンジンに委譲し、実行品質（persona、質問、diary、gate）を担う |
| stage skill（32） | `skills/amadeus-<stage>/`（例: `amadeus-intent-capture`、`amadeus-code-generation`） | 上流 38 skill の適応コピー。単独実行用 stage runner（フラットな stage 名。phase prefix 型の命名は存在しない） |
| scope skill | `skills/amadeus-{feature,bugfix,mvp,...}/` | scope 別の入口補助 |
| 補助入口 | `skills/amadeus-grilling/`、`skills/amadeus-domain-modeling/`、`skills/amadeus-validator/` | 一問ずつの確認、ドメインモデリング、構造検証（公開入口はこの 3 個 + amadeus） |
| 運用 skill | `skills/amadeus-{init,replay,session-cost,outcomes-pack,reverse-engineering}/` ほか | 初期化、リプレイ、コスト集計、成果物パック、コードスキャン |
| エンジン | `.agents/amadeus/tools/`（26 CLI） | 状態機械と directive 発行の正 |
| hooks | `.agents/amadeus/hooks/`（11） | セッション横断の自動記録と督促 |
| validator | `skills/amadeus-validator/validator/` → 昇格先 | v2 準拠の構造検証（マルチ Unit の Per unit 対応 = #484） |
| skill contract | `amadeus-contracts/`、`dev-scripts/{generate,check}-amadeus-contracts.ts` | skill 境界・条件・委譲の生成と検査 |
| promote-skill | `dev-scripts/promote-skill.ts` | source → 昇格先の唯一の同期手段 |
| parity | `dev-scripts/parity-check.ts` + `dev-scripts/data/parity-{map,baseline}.json` | 上流（fde1e1af）との適応差分の追跡。意図的適応は engineFileExceptions へ宣言 |
| eval 群 | `dev-scripts/evals/`（25 種） | 隔離 workspace で実 CLI を駆動する決定論的検証（engine-e2e、hooks、kanban、validator ほか） |
| kanban 可視化 | `dev-scripts/kanban/`、`dev-scripts/kanban-sync.ts` | Projects v2 への一方向鏡（repo 内限定の暫定機構 = #470） |
| lints | `lints/` | public type file / ts-complexity |

## 退役済み（参照しない）

- `intents.md` 索引と IndexGenerate.ts（GD009）
- `amadeus-steering` / `amadeus-event-storming` skill、`amadeus-ideation-*` などの phase prefix 命名（初回解析時の記述で、現行 skill 体制には存在しない）
- examples pipeline（generate/validate-amadeus-examples.ts、examples-contract.ts、skill-provenance.json）は現行ツリーに存在しない
