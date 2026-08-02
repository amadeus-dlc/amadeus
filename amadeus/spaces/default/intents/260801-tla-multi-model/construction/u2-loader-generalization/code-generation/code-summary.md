# Code Summary — u2-loader-generalization(code-generation)

**Intent**: 260801-tla-multi-model / **Unit**: u2-loader-generalization(C3) / **Stage**: code-generation

上流入力(consumes 全数): unit-of-work(u2 節・AC1〜4・テスト割当節), functional-design(business-logic-model / business-rules / domain-entities), nfr-requirements / nfr-design 全件, requirements(FR-2 / FR-4 / FR-6), components(C3), component-methods(C3 / C5 節), services(S1 / S3 / S4), u1 着弾物(`tla-module-deps.ts` / `ModelMapModel.auxiliaries`)

## 変更内容

- `plugins/formal-model-check/tools/tla-model-loader-internal.ts`(改訂):
  - 実行モデル skip(旧 :258)を撤廃し、全登録モデルの model / cfg / **aux** を同一経路(verifyAssetPath → readAsset → sourceIdentity)で identity 照合する `verifyModelAssets` へ再編(BR-V1〜V4)。aux の domain は model と同型の `amadeus.formal-verif.tla.module.v1`(BR-V3)。読込は資産ごとに1回だけで、bytes / source / identity を `VerifiedModelSource` 素材として保持(単一読込原則、BR-V5)。
  - `verifyDeclaredAuxiliaries` 新設(RA Q2=A loader 側検出点): readModule アダプタは検証済み bytes を優先返却し、未宣言モジュールのみ verifyAssetPath + readAsset + UTF-8 fatal decode でその場読みする(読取系失敗は `MODULE_DEP_UNRESOLVED`)。集合比較は u1 `resolveAuxiliaryModules` / `compareModuleDeclarations` の単一実装を共有(BR-D4)。missing / extra どちらか非空なら `SOURCE_DRIFT`(relativePath = 当該モデルの model path、detail に missing/extra/declared/resolved 両集合、BR-D2)。リゾルバ失敗は `ModuleDepsError` として**変換せず伝播**(BR-D3 — SOURCE_DRIFT と別欠陥クラス)。
  - 検証順序は (1) root+map 読込・parse → (2) 全モデル identity 照合 → (3) 全モデル宣言照合 → (4) implementation entries 照合の fail-fast 直列(BR-V6)。`locateAssets` は root 解決 + map パス検証へ縮小(個別 model/cfg のパス検証は各モデルループ内)。
  - 新戻り型: `VerifiedTlaSources { models, modelMap }`(models は宣言順 = parser 強制の名前昇順、追加ソートなし、BR-S2)/ `VerifiedModelSource { model, moduleBytes, cfgBytes, moduleSource, cfgSource, moduleIdentity, cfgIdentity, auxIdentities }`。`selectVerifiedModel(sources, name)` は未登録名を `MODEL_MAP_INVALID`(kind MODEL_LOAD)で明示失敗(BR-S3、silent fallback なし)。`ModelLoadErrorCode` 列挙・canonicalIdentity 計算式・domain 文字列・verifyImplementationEntries semantics は不変(BR-I3/I4、BR-V7)。
  - **time-boxed shim(BR-S4)**: 旧 singular 面(`VerifiedTlaSource` / `loadVerifiedTlaSourceInternal`)を新パイプライン上の薄い射影(`selectVerifiedModel(sources, TLA_EXECUTION_MODEL_NAME)` → 旧型)として残す。旧契約に存在しない `ModuleDepsError` は shim 内部(`narrowForSingularShim`)でのみ SOURCE_DRIFT(detail に元コード `MODULE_DEP_*` を保持)へ窄める — 新 API の error union 分離(BR-D3)は複数形側で完全に維持。**除去条件**: u3 が run-model-check-source.ts / tla-arm.ts を複数形 API へ追随させた時点で u3 が削除する(u3 作業項目)。
- `plugins/formal-model-check/tools/tla-model-loader.ts`(改訂): 無引数 `loadVerifiedTlaSources()` を追加し、旧 `loadVerifiedTlaSource()` を shim として併存(BR-S5)。production seam 性質(両者とも引数なし・注入なし、`import.meta.url` 固定)は不変。型 re-export に `VerifiedTlaSources` / `VerifiedModelSource` / `ModuleDepsError` を追加(runtime export は2関数のみ — 無引数ピンの検査対象)。
- `plugins/formal-model-check/tools/run-model-check-source.ts`(byte-pin 一般化、brief 作業項目3): `loadVerifiedTlaSources()` で全モデル検証 → 要求 modelPath の basename からモデル名導出 → `selectVerifiedModel` で選択(未登録名は明示失敗)→ 要求バイトを**選択モデルの** verified `moduleBytes` / `cfgBytes` と `sameBytes` 照合(照合 semantics 不変、BR-I3)。`publicContractIdentity` は `selected.model.entries` の sha256 join から従来式どおり計算(ADR-10、値不変)。`RunModelCheckSource.source` の型は `VerifiedModelSource` へ。`ModuleDepsError` は旧シグネチャ互換のため本関数内で SOURCE_DRIFT(detail に元コード保持)へ窄める(u3 が shim 除去と併せて見直す seam であることをコメントで明示)。
- `tests/unit/t403-tla-loader-generalization.test.ts`(新規): 合成 fixture(2モデル+aux 宣言)で 全モデル配列契約(件数・宣言順・identity・auxIdentities)/ 宣言漏れ missing 赤 / 過剰宣言 extra 赤(双方向の別ケース化)/ aux identity 不一致赤 / リゾルバ失敗(CYCLE・UNRESOLVED・非UTF-8・空ファイル)が `ModuleDepsError` として伝播し SOURCE_DRIFT へ変換されないこと / selectVerifiedModel の登録名成功・未登録名赤 / skip 撤廃の実証(先頭モデル drift が同一経路で赤)/ shim 射影の緑・未登録赤・ModuleDepsError 窄めの3ケース。
- `tests/unit/t-formal-verif-tla-model-loader.test.ts`(ピン改訂、:10-13): export 期待値を `["loadVerifiedTlaSource", "loadVerifiedTlaSources"]`(shim 期間中の2本、BR-S5 の2段階改訂 第1段)へ、両者 arity 0 を pin。:15-61 のエラーマッピング系は期待値不変で green(BR-I4)。
- `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts`(追従): fixture を aux 宣言済み補正 map へ変更(`withMirrorAuxDeclaration` — MirrorLifecycleCore.tla をコピーし canonical identity を実測して宣言、BR-D6)。内部呼出は全て `loadVerifiedTlaSourcesInternal` へ。実 map の宣言ギャップ赤(missing=[MirrorLifecycleCore])を pin する新ケースを追加(u4 で緑転じるため **u4 が本ケースを更新・削除する**)。「実行モデル未登録で赤」ケースは新 semantics(残モデルを検証して返し、`selectVerifiedModel` のみ明示失敗)へ置換。EXPECTED_MODULE_IDENTITY `742b77…` / EXPECTED_CFG_IDENTITY `92656a…` の値は**不変**(FR-6、BR-I1)。:387-393 の tla-arm.ts 文字列検査(`loadVerifiedTlaSource()`)は shim 存続のため据置き(u3 が `loadVerifiedTlaSources()` へ改訂)。
- 生成ツリー追随: `bun scripts/package.ts` 再生成(dist/plugins/formal-model-check/<harness> 6ツリーの3ファイル同期)、手編集なし。

## AC 証跡

- **AC1(declaration-mismatch red、loader 側・双方向)**: t403「fails SOURCE_DRIFT when a resolved auxiliary is not declared (missing)」(detail に `missing=[BetaCore]`)と「…declared auxiliary is never resolved (extra)」(detail に `extra=[BetaCore]` / `missing=[]`)の**独立2ケース**で双方向を実証。green。さらに統合テスト「reports the MirrorLifecycle declaration gap on the real map until u4」が**実ファイルでの宣言漏れ赤**(missing=[MirrorLifecycleCore])を pin(BR-D6)。
- **AC2(全モデル配列 + 未登録選択の明示失敗)**: t403「returns every registered model in declaration order with verified identities」(`models.length === 2`・宣言順・identity/auxIdentities 一致)と「selectVerifiedModel returns the named model and rejects unknown names」(未登録名 → `MODEL_MAP_INVALID` / kind MODEL_LOAD)。green。
- **AC3(無引数ピン改訂 + FormalElection 不変)**: ピン改訂は上記のとおり green。統合「loads every registered model with migration identities under 250ms」が改訂後 loader 経由で EXPECTED_MODULE_IDENTITY / EXPECTED_CFG_IDENTITY の**値不変**を assert(FR-6)。entries 由来の publicContractIdentity 計算式は非接触(ADR-10)。green。
- **AC4(既存 green + patch gate)**: typecheck / lint / package / promote 各 exit 0(下表)。loader 2ファイルは対象テストで行カバレッジ 100%(t403 + 統合)。**ただし実 map pre-u4 依存の一部既存スイートは BR-D6 の期待挙動として一時赤** — 正確な列挙は下記「実 map 依存の一時赤」節。これらは u4 の宣言追記で緑に転じることを**模擬宣言による事前実証**済み(同節)。

## 検証コマンドと結果

| コマンド | 結果 |
|---|---|
| `bun test tests/unit/t403-tla-loader-generalization.test.ts` | 14 pass / 0 fail、exit 0 |
| `bun test tests/unit/t-formal-verif-tla-model-loader.test.ts tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` | 22 pass / 1 fail(fail は実 map 依存の既知1件、後述) |
| `bun run typecheck`(tsc `--noEmit` × 2) | exit 0 |
| `bun run lint`(biome) | exit 0(warning 数は変更前後で同一、新規指摘なし) |
| `bun scripts/package.ts` / `bun scripts/package.ts --check` | 両方 exit 0 |
| `bun run promote:self:check` | exit 0 |
| `bun test tests/unit`(全334ファイル掃討) | 変更前 baseline 33 fail / 変更後 47 fail + 1 error。**差分14件+1は全て実 map pre-u4 依存の既知セット**(frozen TLA model generator 12・TLC toolchain domain 1・tlc-output 1、+1 error は tlc-output のモジュールレベル `generateFrozenTlaModel` 呼出の同一原因)。それ以外の単体スイートへの波及なし |
| `bun test --coverage`(t403 + loader 統合 + loader 単体) | tla-model-loader-internal.ts / tla-model-loader.ts ともに行カバレッジ **100%** |
| 関連 formal-verif 単体(model-map-v2 / canonical / canonical-core / contract / model-completeness-sensor / run-model-check / tlc-spawn-planner / tlc-public-surface / t401 / t402 / t379) | 全件 green、exit 0 |
| 関連 formal-verif 統合(mirror-model-registration / model-completeness-sensor×2 / ci-workflow / ci-model-check-runner / node-ci-model-check-port / run-model-check-diagnostic / run-model-check-artifacts / ci-model-check-artifacts / tlc-cache / ci-docker-trace / node-toolchain-ports / node-docker-planner) | 全件 green、exit 0 |
| `tests/integration/t-formal-verif-run-model-check-real.integration.test.ts` | 2 skip(環境ゲート、変更前と同じ) |

## 実 map 依存の一時赤(BR-D6 期待挙動、u4 で緑転)

u2 着弾時点の実 model-map.json は MirrorLifecycle の auxiliaries 宣言を持たないため、新パイプラインは `SOURCE_DRIFT`(missing=[MirrorLifecycleCore])で**正しく赤**になる(BR-D6)。shim も新パイプラインの射影であるため、実 map 上で loader / `generateFrozenTlaModel` / `loadRunModelCheckSource` を直接駆動する以下の既存スイートは u4 の宣言追記まで一時赤:

| スイート | 赤件数(u2 単体時点) |
|---|---|
| tests/unit/t-formal-verif-tla-model.test.ts | 12 |
| tests/unit/t-formal-verif-tlc-output.test.ts | 1 |
| tests/unit/t-formal-verif-tlc-toolchain.test.ts | 1 |
| tests/integration/t-formal-verif-tla-model-loader.integration.test.ts | 1(「preserves generator and receipt contracts over external bytes」) |
| tests/integration/t-formal-verif-run-model-check-source.integration.test.ts | 3 |
| tests/integration/t-formal-verif-run-model-check.integration.test.ts | 8 |
| tests/integration/t-formal-verif-tlc-runtime.integration.test.ts | 1 |
| tests/integration/t-formal-verif-planned-tlc-runtime.integration.test.ts | 1 |
| tests/e2e/t-formal-verif-run-model-check.test.ts | 5 |
| tests/e2e/t-formal-verif-tla-toolchain.test.ts | 4 |

**緑転の事前実証**: 実 specs/tla/model-map.json へ MirrorLifecycleCore の canonical identity 宣言を一時的に追記(u4 相当を模擬)した状態で上記全スイートを再実行し、**全件 green**(21/26/8 pass、統合 17/3/9/34/1 pass、e2e 6/4 pass)を確認後に map を復元した(`git diff` 空)。なお模擬宣言下では逆に統合の「reports the MirrorLifecycle declaration gap on the real map until u4」だけが赤になる — 本ケースは pre-u4 状態の pin であり、**u4 が宣言追記と同じコミットで更新・削除する**こと。

参考(非因果): tests/e2e/t-formal-verif-model-completeness-sensor.test.ts の 5 fail は**変更前 baseline でも同一に赤**(本 Unit 非起因)。

## 乖離・留意

- **BR-S6 の確定(オープン事項の解消)**: u1 の `parseTlaModelMap` は `models: []` を `MODEL_MAP_INVALID` で**拒否する**(実測 + 既存テスト「rejects an empty models array」)。よって loader 側の空 models ガードは**設けなかった**(BR-S6「parser 拒否時は二重化しない」分岐)。
- **shim の ModuleDepsError 窄め**: 設計 §3.1 の「薄い射影」と旧戻り型契約(`TlaModelPipelineError` のみ)を両立させるため、shim 内部でのみ `ModuleDepsError` → SOURCE_DRIFT(detail に元コード保持)の窄めを入れた。複数形 API の error union 分離(BR-D3)は維持。t403「narrows resolver failure onto SOURCE_DRIFT for the old error contract」で実証。run-model-check-source.ts 内の同型の窄めも同旨(u3 が shim 除去時に撤去)。
- **unit-of-work との所有差異**: run-model-check-source.ts の byte-pin 一般化は unit-of-work では u3(C5)仕分けだが、bolt brief 作業項目3 の指示どおり本 Unit で先行実施した(選択 API・型供給と同時着弾が前提固定のため)。u3 は vocabulary 供給・shim 除去・`:392` 期待文字列改訂に集中できる。
- **統合テスト :345-356 の置換**: 設計 §5.3 は「models 空配列ケースへ置換」としていたが、BR-S6 確定(parser が空配列を拒否)に伴い「実行モデル概念撤廃後の新 semantics(残モデルを返す + 選択のみ明示失敗)」を検査するケースへ置き換えた(BR-S3 の統合面実証)。
- **run-model-check-source.ts の patch gate**: byte-pin 一般化の変更行は同ファイルの統合スイートがカバーするが、同スイートは実 map 依存で u4 まで一時赤のため、u2 単体の CI では当該行が 0-hit 計測になりうる(模擬宣言下では 3 pass で到達済み)。u4 着弾後の CI で解消する。
- `amadeus-state.md` / audit shard の差分は swarm driver の記録であり、本 Unit の実装コミットには含めていない。

## u3 / u4 への引き継ぎ

- **u3(shim 除去契約)**: run-model-check-source.ts / tla-arm.ts を複数形 API へ追随させた時点で、旧 singular export(`loadVerifiedTlaSource` / `loadVerifiedTlaSourceInternal` / `VerifiedTlaSource`)と `narrowForSingularShim` を削除し、無引数ピンの export 期待値を `["loadVerifiedTlaSources"]` へ、統合テスト :392 相当の期待文字列を `loadVerifiedTlaSources()` へ再改訂する(2段階改訂の第2段)。run-model-check-source.ts 内の ModuleDepsError 窄めコメント箇所も同時に見直すこと。`VerifiedModelSource.model.vocabulary` が語彙配給の受け口(ADR-6)。
- **u4**: MirrorLifecycle の auxiliaries 宣言追記と**同じコミット**で、統合テスト「reports the MirrorLifecycle declaration gap on the real map until u4」を更新・削除すること(宣言後は本ケースが赤になる = 緑転の検出器)。aux identity の計算は `canonicalIdentity(source, "amadeus.formal-verif.tla.module.v1")` で loader と同一アルゴリズム(統合 fixture `withMirrorAuxDeclaration` が同一計算を実装済み、u4 AC3 の対照に使える)。
- **u4 ブロッカー**: なし。u2 は u4 の前提(loader aux 照合)を完備済み。

## Review
