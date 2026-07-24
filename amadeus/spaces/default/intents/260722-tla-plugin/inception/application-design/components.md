# Components — 260722-tla-plugin

上流入力(consumes 全数): requirements(FR-1〜FR-6/NFR)、architecture(P0ギャップ・plugin機構・TLC実行契約)、component-inventory(既存コンポーネント表)、team-practices(変更なし判定 — 既存規約適用)

## コンポーネント一覧(新設・変更・再利用)

| # | コンポーネント | 種別 | 責務 | 推定規模 |
|---|---|---|---|---|
| C-1 | PluginStageDiscovery(amadeus-graph.ts 内の walk 拡張) | 変更 | compileStageGraph の走査対象に `plugins/*/stages/*.md` を追加。slug 衝突の loud reject。plugin 0件時の compile 出力 byte-identical 維持 | +約80行 |
| C-2 | run-model-check CLI(scripts/formal-verif/run-model-check.ts) | 新設 | .tla/.cfg を入力に TLC 完全探索を1回実行し、fail-closed verdict(exit 0/1/2+)を返す汎用エントリポイント。composition rootはparse→load→path validate→reserve→execute→reportだけを所有し、path/cache、receipt、reporter、予約後publish境界は責務別moduleへ委譲する | root約190行+責務別module |
| C-3 | TlcSpawnPlanner 抽象+Darwin/Docker 2実装 | 新設 | TLC 起動 argv のラップと環境検証戦略の選択(Darwin = sandbox-exec+既存drift検証 / Docker = temurin@digest+jarチェックサム検証、sandbox receipt 系は宣言的非適用 — ADR-6) | 約180行 |
| C-3b | fs-tlc-toolchain.ts の prepare()/run() 委譲リファクタ | 変更 | run() 内ハードコードの sandbox-exec argv 構築(:1289-1296)と環境検証(:1263-1278)を planner へ委譲。既存 Darwin 経路の挙動は byte-equivalent | 約120行変更 |
| C-4 | TlaModelLoader(tla-arm.ts の読込経路変更) | 変更 | MODEL_SOURCE/CFG_SOURCE 埋め込みを specs/tla/ 外部ファイル読込に置換。identity 生成(TextEncoder→canonicalIdentity)は不変 | 約60行差替 |
| C-5 | specs/tla/ モデル資産 | 新設 | FormalElection.tla / FormalElection.cfg(埋め込み版とバイト一致)+ model-map.json(モデル⇔実装対応登録簿) | .tla 約310行(既存転記)+ map 約20行 |
| C-6 | model-completeness sensor(manifest + amadeus-sensor-model-completeness.ts) | 新設 | model-map.json に登録された実装ファイル群の sha256 を再計算し、登録値との乖離(spec 変更×モデル未更新)を SENSOR_FAILED で検出 | 実装約200行+manifest約40行 |
| C-7 | ci.yml formal ジョブ | 変更 | workflow_dispatch 専用ジョブ(`if: github.event_name == 'workflow_dispatch'`)。ubuntu + docker run(temurin@digest)+ jar チェックサム検証 → run-model-check.ts 実行 | +約45行 |
| C-8 | formal-model-check プラグイン(plugins/formal-model-check/) | 新設 | plugin.json + stages/formal-model-check.md(ステージ本体、sensors: [model-completeness] 宣言)+ README(opt-in 依存の適用面別明文化) | 約150行(md/json) |

合計推定: 実装系 約935行(C-3/C-3b 再算定後 — iteration 1 Critical 是正)+ md/json 約210行 + テスト(unit/integration)約700行〔units-generation iteration 1 Major-1 是正 2026-07-22: Unit 別内訳(100+150+250+50+150)の機械合算で 600→700 へ更新〕。

## Reuse Inventory(再利用棚卸し — 新規機構は既存で代替不能な場合のみ)

| 既存資産 | 扱い |
|---|---|
| plugin-composition.ts / plugin-projection.ts | 無改変再利用(compose/drop/投影は既存契約のまま) |
| fs-tlc-toolchain.ts(normalize・issue検証・identity検証) | 再利用。ただし prepare()/run() は C-3b の変更対象(spawn argv 構築と環境検証の planner 委譲 — fail-closed 判定 normalize は無改変で planner 非依存) |
| tlc-toolchain.ts(純ドメイン層) | 無改変再利用 |
| run-skeleton-ci.ts / arm-s系 / eligibility系 | 無改変保持(実験資産 — intent Q2 裁定) |
| sensor dispatcher(amadeus-sensor.ts) | 無改変再利用(C-6 は通常の manifest 追加) |
| ci.yml 既存ジョブ | 無改変(FR-5.4 — dispatch 追加が push/PR 経路に影響しないこと) |

新設機構は C-1(walk拡張 — plugin ステージの engine 到達に既存代替なし: P0ギャップ実測)と C-6(sensor — spec ドリフト検出に既存代替なし)のみ。adapter・外部契約の先行着地なし — 全コンポーネントは本intent内で実装+配線が揃う。

## コンポーネント境界と所有

- C-1 はコア框架(packages/framework/core/tools/)所有 — dist 6面再生成対象
- C-2/C-3 は scripts/formal-verif/ 所有(repo ローカル開発支援 — 配布フレームワーク外、Bun-only Forbidden 非抵触)
- C-5 は repo 所有(plugin drop でも残る仕様資産 — requirements Q2)
- C-6 はコア sensor(requirements Q3)、C-8 は plugins/ 名前空間(コアと構造的に素)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T12:47:12Z
- **Iteration:** 2
- **Scope decision:** none

iteration1のCritical1(TlcSpawnPlanner再設計・C-3b計上・規模935行再算定)、Major1(ADR-7 self-hosted前提)、Minor2件の閉包を実コード再実測で確認。規模内訳の機械再計算一致。残るFR-3.5文言不整合は非ブロッキング(conductorが追補済み)。

### Findings

- None
