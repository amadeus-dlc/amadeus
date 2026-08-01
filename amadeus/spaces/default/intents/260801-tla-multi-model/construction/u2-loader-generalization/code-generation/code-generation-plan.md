# Code Generation Plan — u2-loader-generalization

上流入力(consumes 全数): `../functional-design/business-logic-model.md` / `business-rules.md` / `domain-entities.md`、`../nfr-requirements/`(5件)、`../nfr-design/`(5件)、`../../../inception/units-generation/unit-of-work.md`(u2 節・AC1〜4・テスト割当節)、`../../../inception/requirements-analysis/requirements.md`(FR-2 / FR-4 / FR-6)、u1 着弾物(`tla-module-deps.ts` / スキーマ拡張 `ModelMapModel.auxiliaries`)

## 目的

loader を「固定1モデル(TLA_EXECUTION_MODEL_NAME)だけを検証して単一 `VerifiedTlaSource` を返す」構造から「**全登録モデルを同じ深さで検証し、全モデルの検証済みソース配列を返す**」構造へ一般化する(SD Q1=A / ADR-4)。aux identity 照合と宣言-vs-解決の双方向照合(u1 リゾルバ共有、RA Q2=A 検出点①)を loader 側検出点として新設し、戻り値を `VerifiedTlaSources` + `selectVerifiedModel` へ改訂する。

## 前提の実測確定(code-generation 冒頭)

- **BR-S6(空 models ガード、条件付き)**: u1 実測の結果、`parseTlaModelMap` は `models: []` を `MODEL_MAP_INVALID`("models must be a non-empty array")で**拒否する**(amadeus-formal-verif-model-map.ts の models ガード + 既存テスト「rejects an empty models array」)。よって loader 側の空ガードは**二重化しない**(BR-S6 の「parser 拒否時は loader ガード不要」分岐に確定)。

## 実装計画(実行順)

1. `plugins/formal-model-check/tools/tla-model-loader-internal.ts` 改訂
   - `verifyRegisteredAssets` の実行モデル skip(:258)撤廃 → 全モデルの model/cfg/**aux** を同一経路(verifyAssetPath → readAsset → sourceIdentity)で identity 照合する `verifyModelAssets` へ再編。読込は1回だけ行い bytes/source/identity を戻り値素材として保持(単一読込原則、BR-V5)。
   - aux identity domain は model と同型の `amadeus.formal-verif.tla.module.v1`(BR-V3)。
   - `verifyDeclaredAuxiliaries` 新設: readModule アダプタ(検証済み bytes 優先・未宣言モジュールはその場読み、読取系失敗は `MODULE_DEP_UNRESOLVED` へ)+ u1 `resolveAuxiliaryModules` / `compareModuleDeclarations` で双方向照合。missing/extra 非空は `SOURCE_DRIFT`(detail に declared/resolved 両集合、BR-D2)。リゾルバ失敗は `ModuleDepsError` として変換せず伝播(BR-D3)。
   - 検証順序は (1) root+map parse → (2) 全モデル identity 照合 → (3) 全モデル宣言照合 → (4) entries 照合の fail-fast 直列(BR-V6)。`locateAssets` は root + map パス検証へ縮小。
   - 新戻り型 `VerifiedTlaSources` / `VerifiedModelSource`、純粋関数 `selectVerifiedModel`(未登録名は `MODEL_MAP_INVALID` 明示失敗、BR-S3)。`ModelLoadErrorCode` 列挙不変(BR-I4)。
   - **time-boxed shim(BR-S4)**: 旧 singular 面(`VerifiedTlaSource` / `loadVerifiedTlaSourceInternal`)を新パイプライン上の薄い射影(FormalElection 選択 → 旧型)として残す。旧契約にない `ModuleDepsError` は shim 内部でのみ SOURCE_DRIFT(detail に元コード保持)へ窄める。除去条件: u3 が run-model-check-source.ts / tla-arm.ts を複数形 API へ追随後に u3 が削除。
2. `plugins/formal-model-check/tools/tla-model-loader.ts` 改訂: `loadVerifiedTlaSources()`(無引数)追加 + 旧 `loadVerifiedTlaSource()` shim 併存。型 re-export 拡張(`VerifiedTlaSources` / `VerifiedModelSource` / `ModuleDepsError`)。runtime export は2関数のみ(無引数ピン対象)。
3. `plugins/formal-model-check/tools/run-model-check-source.ts` byte-pin 一般化(brief 作業項目3): `loadVerifiedTlaSources()` + 要求 modelPath basename からモデル名導出 + `selectVerifiedModel` で選択 → 選択モデルの verified bytes と `sameBytes` 照合(照合 semantics 不変、BR-I3)。`publicContractIdentity` は `selected.model.entries` から従来式どおり計算(ADR-10)。`RunModelCheckSource.source` 型は `VerifiedModelSource` へ。
4. テスト
   - 新規 `tests/unit/t403-tla-loader-generalization.test.ts`: 全モデル配列契約(順序・identity・auxIdentities)/ 宣言漏れ missing 赤 / 過剰宣言 extra 赤 / aux identity 不一致赤 / リゾルバ失敗伝播(MODULE_DEPS ≠ SOURCE_DRIFT)/ selectVerifiedModel 未知名赤 / skip 撤廃実証 / shim 射影・窄めの赤緑。
   - `tests/unit/t-formal-verif-tla-model-loader.test.ts:10-13` ピン改訂: export 期待値 `["loadVerifiedTlaSource", "loadVerifiedTlaSources"]`・両者 arity 0(BR-S5、2段階改訂の第1段)。
   - `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` 追従: fixture を aux 宣言済み補正 map へ(BR-D6)、EXPECTED_* identity 値不変(FR-6)、「実行モデル未登録で赤」ケースは「残モデルを返し選択のみ明示失敗」の新 semantics へ置換、実 map の宣言ギャップ赤を pin(u4 で緑転じるため u4 が本ケースを更新)。
5. 検証: 対象テスト green / typecheck exit 0 / biome check exit 0 / 関連 formal-verif スイート green(実 map 依存の pre-u4 赤は列挙して報告)/ `bun scripts/package.ts` + `--check` / `promote:self:check`。

## AC 対応

- AC1(declaration-mismatch red、双方向): t403 missing/extra 両ケース + 統合 fixture。
- AC2(全モデル配列 + 未登録選択の明示失敗): t403 配列契約 / selectVerifiedModel ケース。
- AC3(無引数ピン改訂 + FormalElection identity 不変): ピン改訂 + 統合 EXPECTED_* 値不変。
- AC4(既存 green + patch gate): typecheck / lint / package / promote 各 exit 0、変更行カバレッジ確認。**ただし実 map pre-u4 依存スイートの一時赤は BR-D6 どおりの期待挙動として列挙報告する**(u4 の宣言追記で緑転じることを模擬宣言で事前実証済み)。

## 結果

実装・検証は `code-summary.md` のとおり。実 map 依存スイートの一時赤の正確な列挙と u3/u4 への引き継ぎ事項も同書に記録。
