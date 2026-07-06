# コンポーネント一覧：amadeus

## 一覧

| コンポーネント | 場所 | 責務 |
|---|---|---|
| 単一入口 `amadeus` | `skills/amadeus/`、`.agents/skills/amadeus/` | forwarding loop の conductor。routing はエンジンに委譲し、実行品質（persona、質問、diary、gate）を担う |
| stage skill（32） | `skills/amadeus-<stage>/`（例: `amadeus-intent-capture`、`amadeus-code-generation`） | 上流 38 skill の適応コピー。単独実行用 stage runner（フラットな stage 名。phase prefix 型の命名は存在しない） |
| scope skill | `skills/amadeus-{feature,bugfix,mvp,...}/`、`skills/amadeus-compose/` | scope 別の入口補助。amadeus-compose は `/aidlc compose` の packaging skill（Adaptive Workflows 2.2.0 追加） |
| scope 定義（10） | `.agents/amadeus/scopes/amadeus-*.md`（1 scope 1 ファイル） | 上流 9 scope + Amadeus 独自の `pdm`（企画・要求定義止まりで Construction / Operation を持たない。上流に対応がなく parity 例外宣言 = #429）。`pdm` は engine scope 定義のみで、対応する `skills/amadeus-pdm/` skill package は持たない |
| installer | `scripts/amadeus-install.ts`（`npm run amadeus:install` / `bun run scripts/amadeus-install.ts --target <workspace>`） | エンジン（`.agents/amadeus/` 7 dir）、`amadeus*` skill、変換済み `AMADEUS.md`、`.claude/*` symlink、hooks wiring を対象 workspace へ配布する唯一の配布手段。冪等（#451） |
| 補助入口 | `skills/amadeus-grilling/`、`skills/amadeus-domain-modeling/`、`skills/amadeus-validator/` | 一問ずつの確認、ドメインモデリング、構造検証（公開入口はこの 3 個 + amadeus） |
| 運用 skill | `skills/amadeus-{init,replay,session-cost,outcomes-pack,reverse-engineering}/` ほか | 初期化、リプレイ、コスト集計、成果物パック、コードスキャン |
| agents | `.agents/amadeus/agents/`（14 agent persona） | 各ロールの persona 定義。2.2.0 で amadeus-composer-agent（Adaptive Workflows の dispatch 受け手）を追加し 13→14 |
| エンジン | `.agents/amadeus/tools/`（26 CLI） | 状態機械と directive 発行の正 |
| hooks | `.agents/amadeus/hooks/`（11） | セッション横断の自動記録と督促 |
| validator | `skills/amadeus-validator/validator/` → 昇格先 | v2 準拠の構造検証（マルチ Unit の Per unit 対応 = #484） |
| skill contract | `amadeus-contracts/`、`dev-scripts/{generate,check}-amadeus-contracts.ts` | skill 境界・条件・委譲の生成と検査 |
| promote-skill | `dev-scripts/promote-skill.ts` | source → 昇格先の唯一の同期手段 |
| parity | `dev-scripts/parity-check.ts` + `dev-scripts/data/parity-{map,baseline}.json` | 上流（b67798c3 = AI-DLC v2 2.2.0 Adaptive Workflows）との適応差分の追跡。意図的適応は engineFileExceptions へ宣言 |
| eval 群 | `dev-scripts/evals/`（29 種） | 隔離 workspace で実 CLI を駆動する決定論的検証（engine-e2e、hooks、kanban、validator ほか。新規 4 種: `docs-codekb-guards`＝codekb repo キーの worktree 名漏れ回帰検査 #498、`installer`＝配布インストーラの実 CLI 検証 #451、`pdm-scope`＝`pdm` scope の空 Construction e2e #429、`persist-cid-metamain`＝learnings persist の cid 衝突と import 副作用の回帰検査 #504/#507） |
| kanban 可視化 | `dev-scripts/kanban/`、`dev-scripts/kanban-sync.ts` | Projects v2 への一方向鏡（repo 内限定の暫定機構 = #470） |
| lints | `lints/` | public type file / ts-complexity |

## 退役済み（参照しない）

- `intents.md` 索引と IndexGenerate.ts（GD009）
- `amadeus-steering` / `amadeus-event-storming` skill、`amadeus-ideation-*` などの phase prefix 命名（初回解析時の記述で、現行 skill 体制には存在しない）
- examples pipeline（generate/validate-amadeus-examples.ts、examples-contract.ts、skill-provenance.json）は現行ツリーに存在しない
