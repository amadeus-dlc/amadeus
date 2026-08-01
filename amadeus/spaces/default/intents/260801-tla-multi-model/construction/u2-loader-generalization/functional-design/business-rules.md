# Business Rules — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): unit-of-work(u2 節・AC1〜4, テスト割当節), unit-of-work-story-map(FR→Unit 写像 — stories 未生成の代替), requirements(FR-2 / FR-4 / FR-6, NFR-1/2/4), components(C3), component-methods(C3 / C5 節), services(S1 / S3 / S4), decisions(ADR-1 / ADR-2 / ADR-4 / ADR-7 / ADR-10), u1 functional-design(BR-C1〜C3 / BR-R3), 実測ソース(business-logic-model.md 冒頭と同じ)

unit-of-work-story-map は FR 写像表(stories なし)であり、u2 帰属は FR-2 / FR-4 / FR-6 で本書の規則由来と一致する。詳細なアルゴリズム・型定義は business-logic-model.md / domain-entities.md を参照。本書は合格/不合格を一意に判定できる規則と red 実証の義務を固定する。

## ローダ検証規則(BR-V: Verify — verifyRegisteredAssets 拡張)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-V1 | 登録資産の identity 照合は**全登録モデル**に対して行う。`model.name === TLA_EXECUTION_MODEL_NAME` による skip(現行 :258)は撤廃し、どのモデルも照合から exempt されない | fail = いずれかの登録モデルが照合ループから漏れる(部分照合) | components C3, FR-4, ADR-4 |
| BR-V2 | 照合対象資産はモデルごとに model / cfg / **aux 全件**。aux は `model.auxiliaries ?? []` を展開し、各要素を model と同じ検査経路(verifyAssetPath → readAsset → sourceIdentity)に通す | fail = aux が照合対象から漏れる / model・cfg と異なる検査強度を適用する | FR-2, components C3 |
| BR-V3 | aux の identity domain は `amadeus.formal-verif.tla.module.v1`(model と同型)。cfg だけが `…tla.cfg.v1` | fail = aux に専用 domain・生 bytes sha256 等の別式を使う | ADR-1(RA Q1=A), services S3 |
| BR-V4 | model/cfg/aux のいずれかの identity が宣言値と不一致なら `SOURCE_DRIFT` で明示失敗。relativePath は不一致資産の宣言 path、detail は「registered asset identity differs from model map」で統一 | fail = aux 不一致を黙って通す / 別エラー種に逃がす | NFR-2, 現行 :269-271 semantics 踏襲 |
| BR-V5 | 資産の読込・identity 計算はモデルごとに**1回だけ**行い、結果(bytes / source / identity)を戻り値へ流用する(単一読込原則)。照合済み bytes を宣言解決(§BR-D)にも使い、照合したものと解決したものが別物になる経路を作らない | fail = 同一資産の二重読込 / 照合 bytes と解決ソースの不一致があり得る構造 | 設計決定(business-logic-model §1.1/§2.1) |
| BR-V6 | 検証順序は (1) root+map 読込・parse → (2) 全モデル identity 照合 → (3) 全モデル宣言-vs-解決照合 → (4) implementation entries 照合、の fail-fast 直列。最初の失敗で打ち切る | fail = 順序の入替(例: entries 照合を宣言照合より先に行う) / 失敗後も継続して結果を返す | component-methods C3, services S1 |
| BR-V7 | `verifyAssetPath` / `readAsset` / `sourceIdentity` / `verifyImplementationEntries` の semantics は不変。本 Unit は aux を既存経路へ通す拡張のみで、境界検査・symlink 拒否・UTF-8 fatal decode・entries sha256 照合の規則には触れない | pass = 既存の境界系 red ケース(:150-240, :271-325)が期待値不変で通る | NFR-1, ADR-10 |

## 宣言-vs-解決照合規則(BR-D: Declaration — RA Q2=A loader 側検出点)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-D1 | 全登録モデルについて u1 の `resolveAuxiliaryModules` を実行し、解決集合(自己除く・ソート済み)と宣言集合(auxiliaries path 由来のモジュール名集合、省略は空)を**双方向**比較する。missing = 解決 − 宣言(宣言漏れ)、extra = 宣言 − 解決(過剰宣言) | pass = missing・extra がともに空のときのみ緑。fail = 片方向の部分集合判定だけで緑にする | RA Q2=A, ADR-2/ADR-7, u1 BR-C1 |
| BR-D2 | missing・extra のどちらかが非空なら `SOURCE_DRIFT` で明示失敗。relativePath は当該モデルの model path、detail は missing/extra を区別し declared/resolved 両集合を含む | fail = 不一致を黙って通す / detail に集合が出ず診断不能 | u2 AC1, u1 BR-C3, NFR-2 |
| BR-D3 | リゾルバ自体の失敗(`MODULE_DEP_UNRESOLVED` / `MODULE_DEP_CYCLE` / `MODULE_DEP_OUT_OF_BOUNDS`)は `ModuleDepsError` として変換せず伝播する。「宣言と解決のズレ」(SOURCE_DRIFT)と「解決不能」(MODULE_DEPS)は別欠陥クラスとして error union を分離する | fail = リゾルバ失敗を SOURCE_DRIFT に丸める(原因分類の喪失) | 設計決定(business-logic-model §2.2) |
| BR-D4 | 比較規則・抽出規則の実装は u1 の `tla-module-deps.ts` 単一実装を共有し、loader 側に抽出・比較の別実装を置かない。loader の責務は readModule アダプタとエラー変換のみ | fail = loader 内に EXTENDS/INSTANCE 抽出や集合比較の複製実装 | ADR-2, u1 BR-C2 |
| BR-D5 | TLA 標準モジュール(u1 TLA_STANDARD_MODULES)は解決集合に入らず宣言照合でも対象外。宣言側に標準モジュールを書いた場合は extra として赤(解決されないため自然に検出される — 特別扱いしない) | pass = MirrorLifecycle.tla の標準 EXTENDS で偽赤にならない。fail = 標準モジュール宣言を黙って豁免する | u1 BR-R3, BR-D1 の帰結 |
| BR-D6 | u2 単体時点で実 map(MirrorLifecycle に aux 宣言なし)は loader 検証が赤(missing = {MirrorLifecycleCore})になるのが**正しい挙動**。緑にするのは u4 の宣言追記であり、u2 はこの赤を「落ちる実証」として固定し、緑経路テストは aux 宣言済み fixture で構成する | pass = t403 / 統合 fixture がこの構造で赤緑両経路を持つ。fail = u2 が宣言追記まで手を出す(u4 スコープ侵食) | u2 AC1, unit-of-work u4 依存節 |

## 選択・戻り値規則(BR-S: Select — SD Q1=A)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-S1 | 無引数 loader は「全登録モデルの検証済みソース配列」(`VerifiedTlaSources.models`)を返す。`executionModel` 単一フィールド・`TLA_EXECUTION_MODEL_NAME` / `TLA_MODEL_PATH` / `TLA_CFG_PATH` の loader 内固定導出は撤廃する | fail = 単一モデルだけを返す経路が残る / 実行モデル名の固定参照が loader 内に残る | SD Q1=A, ADR-4, FR-4 |
| BR-S2 | `models` 配列の順序は model-map.json の宣言順そのまま(parser 強制の一意・名前昇順 = 決定的順序)。loader 側で追加のソート・並替を行わない | pass = 同一 map から常に同一順序の配列。fail = 読込順・fs 列挙順等の非決定的要因が順序に混入 | component-methods C3, domain-entities §1 |
| BR-S3 | 単一モデルが必要な呼出側は `selectVerifiedModel(sources, name)` で絞る。**未登録名は `MODEL_MAP_INVALID`(kind MODEL_LOAD)の明示失敗**で、silent fallback・先頭要素への黙示既定は禁止 | fail = 未登録名で null/undefined/先頭要素を返す | NFR-2, u2 AC2, component-methods C3 |
| BR-S4 | 旧 singular 面(`loadVerifiedTlaSource` / `loadVerifiedTlaSourceInternal` / `VerifiedTlaSource`)は**期間限定の互換 shim として残す**(Finding-1 裁定、選択肢 (a))。呼出側は tla-model-loader.ts(u2 所有)・run-model-check-source.ts / tla-arm.ts(u3 所有)の3箇所で、u3 は DAG 上 u2 に依存しないため着順保証がなく、即時削除は u2 着弾〜u3 着弾間の typecheck / 既存テストを壊す(u2 AC4 違反)。shim の内部は新しい全モデル検証パイプラインへの薄い射影(FormalElection 選択→旧型)に一本化し、検証実装の二重化はしない。**除去条件**: u3 が run-model-check-source.ts と tla-arm.ts を複数形 API へ追随させた時点で u3 が削除する(上流 component-methods C5 は shim を前提としないため u3 内で完結) | pass = u2 着弾後も u3 未着弾の状態で typecheck / 既存テスト green。fail = shim なしの即時削除 / shim に独立した検証実装を持たせる | Finding-1 裁定, ADR-4, u2 AC4 |
| BR-S5 | 無引数 wrapper の production seam 性質は不変: export は無引数関数のみ(shim 期間中は `loadVerifiedTlaSource` + `loadVerifiedTlaSources` の2本、u3 の shim 除去後は `loadVerifiedTlaSources` 1本)、root/fs を実行時入力から選べない。無引数ピンは「export 一覧 + arity 0」の構造で改訂後も同じ性質を検査する(2段階改訂、各段階が落ちる検査として機能) | pass = 改訂ピン(shim 期間中: export `["loadVerifiedTlaSource", "loadVerifiedTlaSources"]`、両者 arity 0)green。fail = 引数付き export の混入 / shim を残したまま u3 完了後も除去しない | FR-4(ピン改訂裁定), Finding-1 裁定, t-formal-verif-tla-model-loader.test.ts:10-13 |
| BR-S6 | **空 models ガード(条件付き、u1 実測トリガ)**: u1 の parser が `models: []` 空配列を許容する場合、loader は map parse 直後・検証ループ突入前に `models.length === 0` を `MODEL_MAP_INVALID`(kind MODEL_LOAD、relativePath = `specs/tla/model-map.json`)の明示失敗で拒否しなければならない。parser が空配列を既に拒否する場合は loader 側ガードは不要(二重化しない)。確定は code-generation 冒頭の u1 実装実測で行い、結果を business-logic-model.md §6 または u1 memory.md へ記録する | pass = (parser 許容時) 空 models map が loader で明示失敗するケースが統合テストに存在 / (parser 拒否時) parse 段階の失敗で足りることを実測で確認。fail = 空 models を黙って緑で返す(検証ゼロ件の成功) | 設計決定(§5.3/§6), NFR-2 |

## 不変性規則(BR-I: Invariance — FR-6 / ADR-10)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-I1 | FormalElection の検証結果は本 Unit の前後で不変: model/cfg identity 照合値(EXPECTED_MODULE_IDENTITY `742b77…` / EXPECTED_CFG_IDENTITY `92656a…`)と entries 照合結果は byte 一致。aux 解決は resolved = declared = ∅ で発火しない | pass = 統合テストの identity 定数が値不変で green。fail = identity 値・照合結果の変化 | FR-6, u2 AC3, 統合テスト :33-34 |
| BR-I2 | frozen model receipt identity の入力は (1) `generateFrozenTlaModel` の frozen bytes(FormalElection 語彙固定)と (2) `publicContractIdentity` = sha256(entries sha256 を `"\n"` join)(run-model-check-source.ts:129-131)**のみ**。本 Unit はこの2入力のいずれにも触れず、receipt identity は前後で byte 一致する | pass = u2 AC3 の pin が green。fail = receipt identity の変化 | ADR-10, u2 AC3 |
| BR-I3 | `canonicalIdentity` の計算式・model/cfg の domain 文字列は不変。byte-pin 照合 semantics(`sameBytes`、:118-123)も不変 — 一般化は「照合相手の選択」のみで、誤バイトは従来どおり赤 | fail = 計算式・照合 semantics への手付かずの変更 | ADR-1/ADR-10, services S4 |
| BR-I4 | loader の改訂で新しい `ModelLoadErrorCode` を追加しない(既存列挙の不変)。失敗分類の追加が必要に見える場合は設計へ差し戻す | pass = エラーマッピングテスト(:15-61)が期待値不変で通る | NFR-1 |

## Red 実証の義務(u2 AC との対応)

| # | 義務 | 実証先 |
|---|---|---|
| BR-P1 | **declaration-mismatch red(loader 側、u2 AC1)**: 宣言漏れ(missing)と過剰宣言(extra)の**両方向**を独立したケースで loader 検証が落ちる。片方向の green で双方向検出を主張しない | t403 宣言漏れ/過剰宣言ケース |
| BR-P2 | **aux identity mismatch red**: 宣言 aux identity と実ファイルの canonical identity の不一致で `SOURCE_DRIFT` | t403 aux identity ケース |
| BR-P3 | **unknown model red(u2 AC2)**: `selectVerifiedModel` の未登録名が明示失敗(silent fallback なし) | t403 selectVerifiedModel ケース |
| BR-P4 | **resolver 失敗の分離 red**: 循環・未解決が SOURCE_DRIFT ではなく ModuleDepsError として返る | t403 伝播ケース |
| BR-P5 | **FormalElection invariance pin(u2 AC3)**: identity 照合結果が変更前後で不変、無引数ピンが FR-4 裁定どおり改訂される | 統合 identity 定数不変 + t-formal-verif-tla-model-loader.test.ts 改訂ピン |
| BR-P6 | **patch gate / 既存 green(u2 AC4)**: 変更行 0-hit 不許容、typecheck / lint / 既存テスト green、テストは修正と同 PR | CI |

## 矛盾チェック

- BR-D6(u2 時点では実 map が赤)と NFR-1「既存テスト green」: 表面だけ矛盾に見える。既存統合テストは u2 で fixture map を aux 宣言済みへ補正する改訂対象(unit-of-work テスト割当で u2 仕分け済み)であり、「実 map のまま green を維持」は要求されていない。実 map が緑に戻るのは u4 の宣言追記後で、unit-of-work の依存 DAG(u4 depends on u2)と整合する。
- BR-S4(shim 暫定残置)と component-methods C3「廃止または薄い互換 wrapper」: 選択肢のうち**薄い互換 wrapper(shim)**を採用(Finding-1 裁定、選択肢 (a))。即時廃止は呼出側の2ファイル(run-model-check-source.ts / tla-arm.ts)が u3 所有で DAG 上の着順保証がないため、u2 着弾〜u3 着弾間で u2 AC4(既存テスト green)を破る。shim は「新パイプライン上の薄い射影」に限定し検証実装を二重化せず、除去条件(u3 の追随完了)を明示して time-box する — バッチ内で Unit 横断の破壊を避ける既存ハウス慣行と整合する。選択肢 (b)(unit-of-work.md の所有権再編)は上流 artefact の改訂を伴い裁量の範囲が大きいため採らなかった。
- BR-D1(双方向照合を全モデルに常時実行)と BR-I1(FormalElection 不変): FormalElection は EXTENDS が標準モジュールのみで resolved = ∅、宣言省略で declared = ∅ のため照合は恒等的に緑 — 常時実行しても結果は不変で両立する。
