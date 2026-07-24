# plugin-skeleton コード生成サマリー

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、performance-design、security-design、unit-of-work、requirements

## 実装結果

U2 `plugin-skeleton` のマージ後欠陥を forward-fix した。plugin bundle は自然な `stages/<slug>.md` を正本とし、compose時だけhost target `plugins/<name>/stages/<slug>.md`へ名前空間化する。さらにcompose時のtrust grantと検証済みmetadata index、run-stage発行直前のstage body digest検証を追加した。

- **レイアウト責務分離**: manifestのstage pathはplugin-root相対`stages/<slug>.md`。`plugin-composition.ts`がhost着地時に`plugins/<name>/`を一度だけ付与し、`plugins/*/plugins/*/stages`を生成しない。
- **trust grant**: compose transactionでplugin/content digest/grant timestamp、所有stage digest、検証済みfrontmatter index、plugin別・aggregate index digestをcomposition recordへ永続化する。dropは所有digest driftを拒否し、record削除でgrantを失効する。crash recoveryはrecord preimageも同じjournalで復元する。
- **compile時index**: `amadeus-graph.ts`はcompose済みmetadata indexを読み、stage bodyの再parseを避ける。composition recordはO_NOFOLLOW・通常ファイル・dev/inode一致・64MiB上限・同一fd完全読取で検証し、identity変更時にcacheを無効化する。aggregate digest、重複path/slug、grant不正はfail-closed。
- **compile hot path**: pluginのUNKNOWN_SENSOR判定を合流loop内で完結させ、不要なpath mapと全stage再走査を除去した。phase別rules解決と空sensor解決を再利用し、空artifact宣言の一時生成を回避する。`scopes: []`のopt-in pluginはstock workflowへ所属しないため、公開`transposeScopeGrid`契約は維持したままcompile統合時だけ冗長な全scope SKIPセルを生成しない。
- **実行時body検証**: `amadeus-orchestrate.ts`は選択したplugin stageの`directive.stage_file`を発行する直前に、realpath containment、祖先/final symlink拒否、O_NOFOLLOW、dev/inode一致、通常ファイル、64MiB上限、同一fd完全読取、SHA-256一致を検証する。compile後のbody driftでも実行へ進めない。
- **Flow A(コア walk 拡張)**: compose済みplugin stageをcore walk後に合流させる。slug衝突はloud reject、path辞書順で決定的、0-plugin時はbyte-identical。
- **エラースキーマ**: `amadeus.plugin-stage-error.v1` の単一行 JSON(SLUG_COLLISION / READ_FAILED / SCHEMA_INVALID / UNKNOWN_SENSOR)、全 code を exit 1 へ写像。POSIX 相対パスのみ、内容・絶対パスは出さない。
- **Flow B(プラグイン供給)**: `plugins/formal-model-check/`(plugin.json + stage[`scopes: []` opt-in / `sensors: [model-completeness]` はコア供給の U5 を参照] + README[ローカル JDK+sandbox-exec / CI Docker digest 固定を FR-2.3 で適用面別に明文化])を authoring し、neutral bundle として `dist/plugins/formal-model-check/` へ出荷。
- **--single opt-in 免除**: `emitSingleRunStage` で `scopes: []` の opt-in plugin ステージを skip-for-scope ガードから免除。stock ステージ(scopes 非空)の skip 拒否は維持。コア32ステージが全て scopes 非空である実測を根拠に、免除は plugin ステージへ一意に効く。
- **可逆性(NFR-4)**: 実engineのcompose→doctor→compile→--single→drop→baseline E2Eで、実際の`directive.stage_file`が読めること、compile後body driftが拒否されること、drop後がbyte-identicalに戻ることを実証した。

## 主な変更ファイル

- `scripts/plugin-composition.ts`: source/host path分離、trust grant、validated metadata index、drop/recovery
- `packages/framework/core/tools/amadeus-graph.ts`: trusted index読込・cache・検証、plugin merge
- `packages/framework/core/tools/amadeus-orchestrate.ts`: plugin stage path解決と実行直前body検証
- `plugins/formal-model-check/`: plugin.json + stages/formal-model-check.md + README(opt-in 依存文書)
- `dist/plugins/formal-model-check/` + 全6ハーネス dist / self-install: 再生成
- `tests/unit/t252-plugin-composition.test.ts`、`tests/integration/t253-plugin-composition-fs.test.ts`: grant/index/drop/recovery契約
- `tests/integration/t-formal-verif-plugin-stage-discovery.integration.test.ts`: 自然なbundle layout、未compose拒否、index改竄・重複slug拒否
- `tests/integration/t-formal-verif-plugin-lifecycle.integration.test.ts`: 実ライフサイクル、directive path、実行前body drift拒否
- `tests/integration/t-plugin-stage-discovery-performance.integration.test.ts`: 100 plugin回帰と1,000 stage capacity
- `docs/guide/19-plugins.md` / `.ja.md`: source pathとhost着地責務を明文化

## 検証結果(forward-fix)

- 型検査(`typecheck`): PASS
- Lint(Biome): PASS
- `dist:check` / `promote:self:check`: PASS
- 関連unit/integration 81件: PASS(319 assertions)
- 0-plugin baseline byte-identical、ダミー注入、未compose、index改竄、duplicate slug、実行前body drift、drop復帰: PASS
- 性能(Apple M4 Max、Bun 1.3.13、warm-up 2回後10回): focused runは100 pluginのbaseline中央値3.5083ms、treatment中央値3.6960ms、追加5.35%(上限20%)。1,000 stageは最大7.3795ms(上限10秒)、fixture 4,096,000 bytes(上限64MiB)。さらに独立process 10回を連続実行し全件PASS、worst追加率18.13%。
- 禁止layout `plugins/*/plugins/*/stages`: 0件

## Reviewer iteration 2 NOT-READY findingsへのclosure

### Major 1: 更新前functional designの保存

更新前の `business-logic-model.md`、`business-rules.md`、`domain-entities.md` を、既存ファイルがないことを確認してから次の固定archiveへ保存した。既存archiveの上書きはない。

`amadeus/spaces/default/intents/260722-tla-plugin/archive/2026-07-25-plugin-index-recovery/construction/plugin-skeleton/functional-design/`

### Major 2: path contractと変更境界の正本化

現行functional designは、authoring sourceをplugin-root相対 `stages/<slug>.md`、host targetを `plugins/<name>/stages/<slug>.md` と定義した。BR-U2-7はOption 1の裁定を正本として、`amadeus-graph.ts`だけでなく、composition、orchestrate、packaging、documentation、tests、intent recordを変更可能境界へ含めた。trustはcompose時のmetadata index検証とrun-stage発行直前のbody digest検証へ分離した。

### Major 3: 自己完結した性能証跡

- Integration ID: `INT-U2-PLUGIN-PERF`
- テスト: `tests/integration/t-plugin-stage-discovery-performance.integration.test.ts`
- 環境: Darwin 25.5.0、Apple M4 Max、Bun 1.3.13
- 測定法: warm-up 2回後、baseline/treatmentを交互に各10 sample。閾値は追加中央値20%以下。
- 固定fixture: 100 plugins × 1 stage × 4 KiB = 409,600 bytes
- baseline samples (ms): `[3.265208000000001, 3.601832999999999, 3.736083000000008, 4.071124999999995, 3.057457999999997, 3.41466699999998, 3.209583000000009, 3.2250419999999735, 4.04962500000002, 3.6493750000000205]`
- treatment samples (ms): `[3.9887080000000026, 4.243167, 3.7052910000000168, 3.9312500000000057, 3.332499999999982, 3.24837500000001, 3.0698340000000144, 4.079124999999976, 3.6867090000000076, 3.3031669999999735]`
- baseline中央値: 3.5082499999999897 ms
- treatment中央値: 3.696000000000012 ms
- 追加率: 5.3516710610709915%（PASS、上限20%）
- 独立process 10回の追加率(%): `[1.6484, 12.4011, 6.8685, 18.1337, 4.1237, 5.6666, 2.8523, 6.1556, 10.7115, 9.6295]`
- 独立process結果: 10/10 PASS、worst 18.1337%。親agentの独立再測定も4.99%でPASS。
- capacity fixture: 100 plugins × 10 stages × 4 KiB = 4,096,000 bytes、上限64 MiB
- capacity samples (ms): `[6.439292000000023, 6.700707999999963, 6.470082999999988, 7.379542000000015, 5.998166999999967, 6.4232920000000036, 6.940082999999959, 6.563709000000017, 6.302332999999976, 6.310167000000035]`
- capacity最大値: 7.379542000000015 ms（PASS、上限10,000 ms）

### Major 4: 正式quality gates

- `bash tests/run-tests.sh --ci`: PASS、515 test files、7,202 assertions、0 failure。初回はmachine ratchet driftだけが検出されたため、`bun tests/complexity-gate.ts --update` と `bun tests/gen-coverage-registry.ts` で正本を再生成し、対象3 testは80 pass / 1,260 assertions。その後の全CIで機能失敗なしを確認した。
- `bun run coverage:ci -- -P 4`: PASS、515 files、7,202 assertions、`coverage/lcov.info`生成。
- `bun tests/coverage-project-gate.ts --check`: PASS、current 82.5295%、baseline 40.9395%、delta +41.5900pp。
- `AMADEUS_PATCH_BASE_REF=origin/main bun tests/coverage-patch-gate.ts --check`: PASS、measured added lines 0、covered 0、allowlisted 0、uncovered 0。stale allowlist 5件は現行コードの同一分岐へ再固定した。
- 環境依存skipはClaude substrateとAWS live SDK（credentialsなし）のみ。`t-codex-hooks-migration`のwall-clock driftはadvisoryでありfailureではない。

## 逸脱

- 初回のBR-U2-7越境に加え、forward-fixでは`plugin-composition.ts`と`amadeus-orchestrate.ts`へ変更範囲を拡張した。これは2026-07-25のユーザー裁定Option 1で承認済みであり、安全性をcompile時metadata検証と実行時body検証へ分離した。
