# plugin-skeleton コード生成計画

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、performance-design、security-design、unit-of-work、requirements

## 目的

U2 `plugin-skeleton` を実装する。compile された plugin ステージを stage graph に合流させる汎用 walk 拡張(C-1、Flow A)と、opt-in の `formal-model-check` プラグイン供給(C-8、Flow B)の2面を、FR-1.1〜1.4・FR-2.1〜2.4 と横断 FR-6 に沿って実装する。

対象ストーリーは Unit Story Map の「体験ステップ4(plugin ステージの合流と単独実行)」であり、business-logic-model の中核フロー A(engine 配線)/B(formal-model-check プラグイン)/E2E 受け入れ経路に対応する。

## 実装境界と前提

- 初回実装ではコア変更を `amadeus-graph.ts` の walk 拡張へ限定した。マージ後欠陥の forward-fix では、2026-07-25のユーザー裁定 Option 1 により `plugin-composition.ts` の trust grant / validated metadata index と `amadeus-orchestrate.ts` の実行直前body検証まで境界を拡張した。
- plugin ステージの発見は汎用機構とし、formal-model-check 固有のハードコードを持たない(BR-U2-1)。
- 0-plugin 時の compile 出力は拡張前と byte-identical に保つ(BR-U2-3)。drop 後の再 compile も同様。
- `formal-model-check` は neutral bundle(`dist/plugins/<name>/`)のみで供給し、compile 可視の `dist/<harness>/plugins/` へは投影しない(裁定 E-TLAU2 A)。投影された plugin ステージは shipped graph を非 0-plugin 化し recompile-idempotence(t110/t88, FR-2.3)を壊すため。
- opt-in(`scopes: []`)plugin ステージは `--single` が唯一の実行経路のため、skip-for-scope ガードから免除する。stock ステージの skip 拒否は維持する(裁定 E-TLAU2 A)。
- セキュア read(security-design): O_NOFOLLOW open、fstat dev/inode 照合、祖先 symlink 拒否、64MiB 上限、通常ファイルのみ。非対応 platform は fail-closed。
- 受け入れは実 compile+実 orchestrate の E2E とし、verify スタブで代替しない(BR-U2-4)。

## 実装手順

1. [x] **Flow A コア: discover + compile merge**
   - `discoverPluginStageFiles(hostRoot): PluginStageFile[]` を `amadeus-graph.ts` に追加。`<hostRoot>/plugins/<name>/stages/<slug>.md` をセキュア read + stage-schema 検証で列挙し、path 辞書順で返す。
   - `compileStageGraph` の core walk 後に plugin ステージを合流。既存の slug 衝突ガード・auto-seed・`buildGraphStage` を再利用し、plugin ステージを core ステージと不可分にする。
   - エラースキーマ `amadeus.plugin-stage-error.v1`(単一行 JSON、exit 1、POSIX 相対パス)を SLUG_COLLISION / READ_FAILED / SCHEMA_INVALID / UNKNOWN_SENSOR で定義。
2. [x] **Flow B: formal-model-check プラグイン供給**
   - `plugins/formal-model-check/`(plugin.json + stages/formal-model-check.md[`scopes: []` / `sensors: [model-completeness]`] + README[JDK/Docker opt-in 依存を FR-2.3 で明文化])を authoring。
   - `scripts/package.ts` の `projectPluginsIntoHarnessTree` を neutral-bundle 専用へ調整(harness-tree 非投影、BR-U2-7 越境申告)。
3. [x] **--single opt-in 免除**
   - `amadeus-orchestrate.ts:emitSingleRunStage` で `scopes: []` ステージを skip-for-scope ガードから免除(BR-U2-7 越境申告)。
4. [x] **テスト(Comprehensive)**
   - unit/integration: discoverPluginStageFiles(空/1/複数/symlink/schema-invalid)、slug 衝突、UNKNOWN_SENSOR、0-plugin byte-identical(ダミー注入両側)、shipping 構造 guard、--single 両面(stock 拒否 + opt-in 実行)、実 compose→compile→--single→drop→baseline の E2E。
5. [x] **dist 同期 + 検証**
   - 全6ハーネス dist / self-install 再生成。forward-fix 後は `typecheck` / `lint` / `dist:check` / `promote:self:check` と関連unit/integration 81件で検証する。
6. [x] **マージ後欠陥の forward-fix**
   - manifest pathをplugin-root相対`stages/<slug>.md`へ正規化し、composeがhost target `plugins/<name>/<path>`を付与する責務分離へ変更。`plugins/*/plugins/*/stages`を禁止するlayout guardを追加。
7. [x] **trust grant + validated metadata index**
   - compose時にplugin/content digest/grant timestamp、所有stage digest、検証済みfrontmatter indexとaggregate digestをcomposition recordへ同一transactionで永続化。drop/recoveryはrecord preimageと一体で失効・復元する。
   - compileはatomic record identity(dev/inode/size/mtime/ctime)で検証済みindexをcacheし、変更時はO_NOFOLLOW同一fd読取+aggregate digestを再検証。run-stage発行時は選択stage bodyをO_NOFOLLOW、祖先symlink拒否、dev/inode一致、64MiB上限、同一fd SHA-256で再検証する。
8. [x] **性能回帰・capacity実測**
   - `t-plugin-stage-discovery-performance.integration.test.ts`でwarm-up 2回+10回を固定。100 plugin追加中央値20%以下、1,000 stage全compile 10秒未満/64MiB以下を検証し、samplesを`performance-evidence.json`へ保存。
   - 安定化では測定方式・閾値を変えず、plugin sensor判定の再走査、phase rules/空sensorの反復生成、opt-in stageのstock scope-grid SKIPセル生成を除去。独立process 10回で全件PASS、worst追加率18.13%を確認。

## 性能受け入れ証跡

Integration IDは `INT-U2-PLUGIN-PERF`、literal test pathは `tests/integration/t-plugin-stage-discovery-performance.integration.test.ts`。Darwin 25.5.0 / Apple M4 Max / Bun 1.3.13で、warm-up 2回後にbaseline/treatmentを交互に各10回測定した。

- 100 plugins × 1 stage × 4 KiB（409,600 bytes）のbaseline samples (ms): `[3.265208000000001, 3.601832999999999, 3.736083000000008, 4.071124999999995, 3.057457999999997, 3.41466699999998, 3.209583000000009, 3.2250419999999735, 4.04962500000002, 3.6493750000000205]`
- treatment samples (ms): `[3.9887080000000026, 4.243167, 3.7052910000000168, 3.9312500000000057, 3.332499999999982, 3.24837500000001, 3.0698340000000144, 4.079124999999976, 3.6867090000000076, 3.3031669999999735]`
- baseline/treatment中央値: 3.5082499999999897 / 3.696000000000012 ms。追加率5.3516710610709915%で20%上限をPASS。
- 独立process 10回の追加率(%): `[1.6484, 12.4011, 6.8685, 18.1337, 4.1237, 5.6666, 2.8523, 6.1556, 10.7115, 9.6295]`。10/10 PASS、worst 18.1337%。親agentの独立再測定も4.99%でPASS。
- 100 plugins × 10 stages × 4 KiB（4,096,000 bytes）のcapacity samples (ms): `[6.439292000000023, 6.700707999999963, 6.470082999999988, 7.379542000000015, 5.998166999999967, 6.4232920000000036, 6.940082999999959, 6.563709000000017, 6.302332999999976, 6.310167000000035]`
- capacity最大値7.379542000000015 msは10,000 ms上限をPASSし、fixtureは64 MiB上限内。

## 品質ゲート完了条件

- 全CI: `bash tests/run-tests.sh --ci` → 515 test files / 7,202 assertions / 0 failure。
- coverage: `bun run coverage:ci -- -P 4` → 515 files / 7,202 assertions / 0 failure。
- project coverage: `bun tests/coverage-project-gate.ts --check` → 82.5295%、baseline 40.9395%、+41.5900pp。
- patch coverage: `AMADEUS_PATCH_BASE_REF=origin/main bun tests/coverage-patch-gate.ts --check` → measured added 0 / covered 0 / allowlisted 0 / uncovered 0。
- 最終確認: `typecheck`、`lint`、`dist:check`、`promote:self:check`、関連81 test、禁止nested layout、JSON parseをすべてPASSさせる。

## 逸脱と裁定

- BR-U2-7 越境2件(package.ts / orchestrate.ts)は裁定 E-TLAU2 A(ユーザー承認)により正当。[実装 PR #1456](https://github.com/amadeus-dlc/amadeus/pull/1456)本文に明示申告済み。
- 出荷先(neutral bundle のみ)は裁定 E-TLAU2 A(Option 1)により確定。
- recoveryで追加した`plugin-composition.ts` / `amadeus-orchestrate.ts`越境とmetadata index設計は、2026-07-25のユーザー裁定Option 1で明示承認された。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T17:55:45Z
- **Iteration:** 2
- **Scope decision:** none

trust-grant journalは閉包したが、性能一次証拠、必須品質ゲート、上流契約との2件の矛盾が残るためNOT-READY。

### Findings

- (Major) Iteration 1の性能findingは部分閉包に留まる。plan/summaryには閾値・測定値・performance-evidence.json保存の主張があるが、authoritative scope内にsamples、テスト定義、実行出力という一次証拠がなく、100-plugin回帰<=20%および1,000-stage/64MiB<10秒を独立検証できない。
- (Major) requirements FR-6.2/FR-6.3に対し、summaryは関連81件のみを報告し、必須のbash tests/run-tests.sh --ciと新規行lcov未カバー0の結果を記録していないため、Comprehensive品質ゲートの充足が証明されていない。
- (Major) natural plugin layoutの契約が不整合。plan/summaryはmanifest pathをplugin-root相対stages/<slug>.mdとする一方、business-logic-modelとdomain-entitiesはplugins/<name>/stages/<slug>.mdのhost-tree相対pathを要求しており、正本となるpath規約が一意でない。
- (Major) 変更境界が不整合。business-rules BR-U2-7はplugin-composition.ts/amadeus-orchestrate.ts無改変を要求する一方、plan/summaryは両者の変更を実装済みとする。後発ユーザー裁定への言及だけではauthoritativeな上流契約が更新されておらず、実装許容境界を一意に追跡できない。
- (Resolved-Minor) trust-grant journal欠落は、security-designのcompose journal契約とplan/summaryのrecord preimage一体journal・drop失効・recovery復元の宣言によりartifact上で閉包した。
