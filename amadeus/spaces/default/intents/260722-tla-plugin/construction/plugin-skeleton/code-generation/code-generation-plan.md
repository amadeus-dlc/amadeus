# plugin-skeleton コード生成計画

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、performance-design、security-design、unit-of-work、requirements

## 目的

U2 `plugin-skeleton` を実装する。compile された plugin ステージを stage graph に合流させる汎用 walk 拡張(C-1、Flow A)と、opt-in の `formal-model-check` プラグイン供給(C-8、Flow B)の2面を、FR-1.1〜1.4・FR-2.1〜2.4 と横断 FR-6 に沿って実装する。

対象ストーリーは Unit Story Map の「体験ステップ4(plugin ステージの合流と単独実行)」であり、business-logic-model の中核フロー A(engine 配線)/B(formal-model-check プラグイン)/E2E 受け入れ経路に対応する。

## 実装境界と前提

- コア変更は `amadeus-graph.ts` の walk 拡張に限定する(BR-U2-7)。`plugin-composition.ts` / `plugin-projection.ts` は無改変。裁定 E-TLAU2 A により `scripts/package.ts`(投影調整)と `amadeus-orchestrate.ts`(--single 免除)へ越境する場合は、実装 PR 本文に明示申告する。
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
   - 全6ハーネス dist / self-install 再生成。`typecheck` / `lint` / `dist:check` / `promote:self:check` / `run-tests.sh --ci` / coverage green。

## 逸脱と裁定

- BR-U2-7 越境2件(package.ts / orchestrate.ts)は裁定 E-TLAU2 A(ユーザー承認)により正当。実装 PR #1456 本文に明示申告済み。
- 出荷先(neutral bundle のみ)は裁定 E-TLAU2 A(Option 1)により確定。
