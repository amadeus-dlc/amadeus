# Component Inventory

> Reverse Engineering 成果物 — 分析対象: main @ 14c40c9c(現 HEAD 8d73e463)

## ランタイムコンポーネント

| コンポーネント | 場所 | 責務 | 主要依存 |
|---|---|---|---|
| オーケストレーションエンジン | `core/tools/amadeus-orchestrate.ts`(2899行) | `next`(純リード)/ `report`(遷移コミット)。ステージグラフ解決・directive 発行 | directive.ts、状態ファイル、stage-graph.json |
| directive 契約 | `core/tools/amadeus-directive.ts` | エンジン⇄コンダクター間の凍結 JSON 契約(kind ×7 + 予約2) | なし(契約定義) |
| 監査基盤 | `core/tools/amadeus-audit.ts` | VALID_EVENT_TYPES ホワイトリスト、per-clone シャード書き込み、mkdir ロック | 一時ディレクトリロック |
| 決定/回答ロガー | `core/tools/amadeus-log.ts` | DECISION_RECORDED / QUESTION_ANSWERED 発行。HUMAN_TURN 在席ゲート | audit.ts、監査台帳 |
| ランタイムサマリ | `core/tools/amadeus-runtime.ts` | `summary --json` — read-only スキル向け決定論的集計 | 監査台帳、状態 |
| 学習ゲート | `core/tools/amadeus-learnings.ts` | §13 admission チェック(レイヤー矛盾却下) | memory 5層 |
| swarm レフェリー | `core/tools/amadeus-swarm.ts` | swarm 収束判定 | 監査 |
| ランナー生成 | `core/tools/amadeus-runner-gen.ts` | ステージランナースキルの write / check(ドリフトガード) | stage-graph |
| ユーティリティ | `core/tools/amadeus-utility.ts` ほか計27本 | `--*` ハンドラ、状態管理、グラフコンパイル等 | — |
| フック群(11本) | `core/hooks/` | stop(human-wait 判別)/ mint-presence(HUMAN_TURN)/ sensor-fire(PostToolUse)/ ライフサイクル・状態同期・検証・サブエージェント追跡・statusline | questions ファイル、監査、tools |
| コンダクター | `core/amadeus-common/conductor.md` + SKILL.md | LLM 側オーケストレーター。ペルソナ採用・directive 実行 | protocols、stages、agents |
| ステージプロトコル | `core/amadeus-common/protocols/stage-protocol.md`(1000行、ほか3本) | 対話モード契約(3モード)、質問バッチ、write-back 規約 | questions ファイル、log.ts |
| ステージ定義 | `core/amadeus-common/stages/`(5フェーズ 32ステージ) | frontmatter(phase / sensors / agents)+ ステージ手順 | コンパイルで graph 化 |

## エージェント(11体)

| エージェント | 主担当 |
|---|---|
| product | intent-capture、requirements、user-stories |
| design | mockups(rough / refined) |
| delivery | delivery-planning、Bolt 実行統制 |
| architect | feasibility、application-design、units-generation、functional/NFR design、RE synthesis |
| aws-platform | AWS マッピング、infrastructure-design |
| compliance | 規制制約 |
| devsecops | セキュアデザイン、ci-pipeline |
| developer | code-generation、RE code scan |
| quality | testing、validation |
| pipeline-deploy | deployment-pipeline |
| operations | observability、incident-response |

## ビルド・配布コンポーネント

| コンポーネント | 場所 | 責務 |
|---|---|---|
| 配布ビルダー | `scripts/package.ts`(671行) | 5ステップ/ハーネス: core コピー+トークン置換 → harness 上書き → グラフコンパイル → runner-gen → codex emit。`--check` ドリフトガード |
| 昇格 | `scripts/promote-self.ts`(207行) | dist/claude → `.claude/` / `.codex/` / `.agents/` / `CLAUDE.md`(memory/ 対象外)。`promote:self:check` |
| ハーネス manifest | `harness/<name>/manifest.ts` ×4 | coreDirs 等の配布構成宣言。存在による自動発見 |
| codex emitter | `harness/codex/emit.ts` | codex 固有の出力変換 |
| センサー ×4 | `core/sensors/` | required-sections / upstream-coverage / linter / type-check(advisory) |
| read-only スキル ×3 | `core/skills/` | session-cost / replay / outcomes-pack(状態不変・監査不発行) |

## grilling 統合の触点(このインベントリ上)

1. `stage-protocol.md` L258-298 — 第4モード挿入
2. stop フック規約(空 `[Answer]:` タグ)— 継承必須
3. `harness/*/question-rendering.md` ×4 — 必要時改訂
4. `core/skills/amadeus-grilling/` — 新設(read-only スキルパターン踏襲)+ 4 manifest への行追加
5. `amadeus-audit.ts` VALID_EVENT_TYPES — 新イベント型が必要か要判断
6. `amadeus-log.ts` answer 在席ゲート — 高頻度連続回答との相互作用検証
7. バージョンバンプ3点セット(version.ts / CHANGELOG / README、t68)
