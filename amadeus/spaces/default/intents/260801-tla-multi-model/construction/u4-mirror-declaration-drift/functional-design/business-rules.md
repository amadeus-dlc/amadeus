# Business Rules — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): unit-of-work(u4 節・AC1〜4, テスト割当節), unit-of-work-story-map(FR→Unit 写像 — stories 未生成の代替), requirements(FR-2 / FR-3, NFR-1/2/4), components(C7 / C8), component-methods(C7 節), services(S1 / S3), decisions(ADR-1 / ADR-2 / ADR-6 / ADR-7 / ADR-10), u1 functional-design(BR-C1〜C3 / BR-R3), u2 functional-design(BR-D1〜D6 / BR-V2〜V5 / BR-I1〜I4), u3 functional-design(§1.2 語彙確定値), 実測ソース(business-logic-model.md 冒頭と同じ)

unit-of-work-story-map は FR 写像表(stories なし)であり、u4 帰属は FR-2 / FR-3 で本書の規則由来と一致する。詳細なアルゴリズム・型定義は business-logic-model.md / domain-entities.md を参照。本書は合格/不合格を一意に判定できる規則と red 実証の義務を固定する。

## センサ check 規則(BR-SC: Sensor Check — 第2検出点・報告側)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-SC1 | sensor check は全登録モデルの model/cfg/**aux 全件**を domain 付き canonical identity で計測し宣言値と照合する。aux の domain は `amadeus.formal-verif.tla.module.v1`(model と同型)。読込・decode は既存の safeReadFile / decodeIdentity 経路のみを使う | fail = aux が計測・照合から漏れる / aux 専用の別 identity 式・別読込経路を使う | ADR-1, services S3, u2 BR-V2/V3 |
| BR-SC2 | sensor check は全登録モデルで u1 の `resolveAuxiliaryModules` + 宣言比較を実行し、missing(宣言漏れ)・extra(過剰宣言)の**双方向**を検査する。不一致は `{ path: 当該モデルの model path, reason: "declaration-drift" }` の finding で赤(verdict reason は従来どおり `"drift"`) | pass = missing・extra がともに空のときのみ緑。fail = 片方向の部分集合判定だけで緑にする / 不一致を黙って通す | RA Q2=A, u2 BR-D1/D2, u4 AC2 |
| BR-SC3 | リゾルバ失敗(MODULE_DEP_UNRESOLVED / CYCLE / OUT_OF_BOUNDS)は `{ path: model.model.path, reason: "declaration-unresolved" }` の finding で fail-closed に赤。「宣言なしとみなす」等の黙示 fallback は禁止 | fail = リゾルバ失敗を緑にする / drift と unresolved を区別できない分類に潰す | NFR-2, u2 BR-D3 の sensor 側具現化 |
| BR-SC4 | sensor findings の形状は `{ path, reason }` のまま変更しない。declared/resolved/missing/extra の集合 detail は findings に載せられない正直な限定とし、診断は loader の SOURCE_DRIFT detail(u2 BR-D2)と updateModelMap の補正結果で担保する | fail = findings 形状の拡張(harness 消費契約への侵襲) / 集合 detail を持つと偽る | business-logic-model §2.2, 最小変更 |
| BR-SC5 | 宣言照合の実装(抽出・推移解決・集合比較)は u1 の `tla-module-deps.ts` 単一実装を D-U4-1 の配置(GENERATED_PLUGIN_SOURCES の byte-identical 複製)で共有する。sensor 側に抽出・比較の別実装を置かない | fail = sensor 内に EXTENDS/INSTANCE 抽出や集合比較の複製実装 / cross-tree import | ADR-2, u1 BR-C2, scripts/package.ts:785-792 |
| BR-SC6 | 宣言照合は evaluateAssets(identity 計測)の後・evaluateEntries の前に実行し、計測済み bytes を readModule アダプタ経由で解決にも使う(単一読込原則)。照合した bytes と解決したソースが別物になる経路を作らない。deadline・総バイト予算は宣言照合の読込にも適用する | fail = 同一資産の二重読込 / deadline 外の無制限読込 | u2 BR-V5, sensor :31-33 / :493 実測 |

## updateModelMap 規則(BR-SU: Sensor Update — 第2検出点・補正側)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-SU1 | flagless updateModelMap の起動条件は「model/cfg/aux identity のいずれかが変化」**または**「いずれかのモデルで宣言不一致(missing または extra 非空)」。どちらも無ければ従来どおり `MODEL_UNCHANGED`(detail 文言不変 — t380 :169-171 の期待値保護) | fail = 宣言不一致があるのに MODEL_UNCHANGED を返す / 既存の MODEL_UNCHANGED 文言を変える | C7, u4 AC2, NFR-1 |
| BR-SU2 | 宣言不一致モデルの `auxiliaries` は**解決集合へ機械補正**する。identity は `canonicalIdentity(source, "amadeus.formal-verif.tla.module.v1")`(loader 照合と同一アルゴリズム)、path は `specs/tla/<Name>.tla`、配列は path 昇順。解決集合が空のモデルは auxiliaries キーを外す(省略と空配列の区別)。手で identity を編集しない | pass = 補正後の map が u1 スキーマで parse でき、再 check が緑。fail = 手編集 identity / 空配列の出力 | FR-3, ADR-1, u1 §1.3, u4 AC3 |
| BR-SU3 | updateModelMap の補正は**冪等**: 補正直後の再実行は `MODEL_UNCHANGED` を返し、map を動かさない | pass = 2 回連続実行で 2 回目が MODEL_UNCHANGED。fail = 2 回目も publish する(非冪等) | t380 :134-145 系の semantics 踏襲 |
| BR-SU4 | canonicalRecord は `auxiliaries` / `vocabulary` を**保持**する。vocabulary は一切再計算せずパススルー、auxiliaries は宣言(または補正結果)と計測 identity で出力する。publish で optional フィールドを黙って落とす現行の欠陥を本 Unit で修正する | fail = publish 後の map から auxiliaries / vocabulary が消える(データ損失) | ADR-6, business-logic-model §3.1 |
| BR-SU5 | 宣言補正・identity 書戻しを含む全ての publish は既存の lock + validatePublishTarget + publishAtomic 経路のみを通る。補正専用の書込み経路を作らない | fail = atomic publish バイパス | sensor :592-643 / :847-856 実測, NFR-2 |
| BR-SU6 | リゾルバ失敗時の updateModelMap は `UPDATE_FAILED` 系で fail-closed(補正不能を成功と偽らない) | fail = 解決不能のまま宣言を書き換える / 成功を返す | NFR-2 |

## --impl-only ラッチ規則(BR-IO: Impl-Only — entries-only の純粋性)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-IO1 | `assetsUnchanged` は全登録モデルの model/cfg/**aux 全件**の identity 一致を要求する。aux が1件でも変化していれば --impl-only は `INVALID_ARGUMENT` 拒否。detail の既存文言(`updateModelMap` / model-changed 系、t380 :117 が assert する文字列)は変えない | fail = aux 変化を latch が見逃す / 既存 assert 文言の変更 | t380 :102-119 semantics の aux 拡張 |
| BR-IO2 | 宣言不一致(missing/extra 非空)が存在する状態での --impl-only は `INVALID_ARGUMENT` で拒否する。entries だけ更新して宣言不一致を残す「半更新」の publish を許さない。detail は flagless updateModelMap を指す | fail = 宣言不一致下で IMPL_ONLY_UPDATED を返す | business-logic-model §3.3-2 |
| BR-IO3 | --impl-only 成功時の publish は model/cfg/aux identities・auxiliaries 宣言・vocabulary を**更新前と同値**で保持し、entries のみを更新する(entries-only の名に反する書戻しをしない) | pass = t380 拡張ケースの deep-equal pin が緑。fail = entries 以外のフィールドが変化 | t380 系 semantics, business-logic-model §3.3-3 |
| BR-IO4 | MirrorLifecycle entries sha256 の連動更新は `updateModelMap --impl-only` 経路のみで行い(手編集禁止)、**u4 単独が所有**する。他 Unit は MirrorLifecycle entries に触れない | fail = sha256 の手編集 / 他 Unit による entries 更新 | unit-of-work u4 所有ファイル3行目, component-dependency 共有資源節 |

## MirrorLifecycle 宣言規則(BR-MD: Map Declaration — C8 / FR-3)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-MD1 | MirrorLifecycle エントリの `auxiliaries` はちょうど1件 `{ path: "specs/tla/MirrorLifecycleCore.tla", identity: <canonical sha256> }`。identity 値は updateModelMap 補正経路の計算値・loader 照合値・`canonicalIdentity` 直接計算の**三者一致**(同一アルゴリズムの実証) | pass = t405 AC3 ケースが三者一致を assert。fail = 手編集 identity / 不一致 | ADR-1, services S3, u4 AC3 |
| BR-MD2 | `vocabulary.namedInvariants` は MirrorLifecycle.cfg:6-8 の実宣言3件・cfg 宣言順(`TypeOK` / `NoCloseWithoutLandedSync` / `NoDuplicateCreate`)。`CloseUnreachable` は含めない。`traceStateVariables` は `["receipts","issueNumber","boundaryIdx"]`(vars タプル順暫定、u5 実測で最終確定) | pass = mirror-model-registration 拡張 pin が緑。fail = 値・順序の逸脱 | u3 §1.2 確定値, ADR-5 |
| BR-MD3 | 追記は MirrorLifecycle エントリの `auxiliaries`・`vocabulary` フィールド**のみ**。model/cfg identity・entries・FormalElection エントリ(u3 の vocabulary 追記済み)・schemaVersion は一切変更しない。挿入位置は auxiliaries = cfg の後・entries の前、vocabulary = entries の後(canonicalRecord 出力順と一致) | fail = 既存フィールドの値・他エントリへの差分 | ADR-3/ADR-10, unit-of-work 共通契約 |
| BR-MD4 | vocabulary は drift pin の照合対象**ではない**(ADR-6 の正直な限定)。語彙値の機械的保護は mirror-model-registration の pin(§7.2)が担い、identity 値が語彙編集で動かないことに依存した設計を他規則に混入させない | fail = 語彙が pin に覆われているかのような記述・実装 | ADR-6 |
| BR-MD5 | 本宣言の効用として、u2 で赤化した実 map(BR-D6: missing={MirrorLifecycleCore})が loader・sensor の**両検出点で緑へ復帰**する。u4 の緑経路テストは実 map(またはその fixture 複製)で構成し、fixture だけの緑で「実 map 緑」を主張しない | pass = 宣言後の実 repo で check / loader が緑。fail = fixture のみの緑実証 | u2 BR-D6 の表裏, u4 AC2 |
| BR-MD6 | AsImplemented / Vacuity は非接触(Out of scope A2)。差分に `MirrorLifecycleAsImplemented` / Vacuity 系の変更がないことを grep で証明する | fail = 差分混入 | u4 AC4 |

## 不変性規則(BR-I: Invariance — NFR-1 / ADR-10 の sensor 側)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-I1 | FormalElection の検証結果・map 上の宣言は不変: resolved = declared = ∅ で宣言照合は恒等的に緑、canonicalRecord は FormalElection に auxiliaries キーを出さず、vocabulary(u3 追加分)はパススルー | pass = sensor 系既存4テストが期待値不変で green。fail = FormalElection 面の変化 | NFR-1, ADR-10 |
| BR-I2 | verdict 型・`UpdateModelMapResult` 型・CLI 引数面(`--impl-only` の受理位置)・`diffModelMap` / safeReadFile / lock / atomic publish の semantics は不変。追加は FindingReason の2メンバ(`declaration-drift` / `declaration-unresolved`)のみで、新しい失敗 code は `UpdateModelMapResult` に追加しない | pass = t380・sensor 系既存ケースが期待値不変で green。fail = 公開型の破壊的変更 | NFR-1, u2 BR-I4 踏襲 |
| BR-I3 | 宣言照合の導入で sensor のセキュリティ検査(rootContains / symlink 拒否 / TOCTOU / サイズ上限)を緩めない。readModule アダプタのその場読みも deps.readFile(safeReadFile)を通す | fail = 検査バイパス経路の新設 | sensor :208-303 実測 |

## Red 実証の義務(u4 AC との対応)

| # | 義務 | 実証先 |
|---|---|---|
| BR-P1 | **Core semantic edit red(u4 AC1、成功 (ii))**: MirrorLifecycleCore.tla への意味論編集で sensor check が赤(`{path: Core, reason: "changed"}`)、かつ loader も赤(双検出点の同時発火)。**コメントのみの編集も赤**(canonicalIdentity は文字列全体を hash — 「コメントなら素通り」の誤仮定を残さない)。無編集の control は緑 | t405 Core 編集2ケース + control |
| BR-P2 | **declaration-mismatch red(u4 AC2)**: 宣言漏れ(missing)と過剰宣言(extra)の**両方向**を独立ケースで sensor check が赤(`declaration-drift`)。loader 側(u2 BR-P1)とは別検出点の実証として、sensor の finding で赤になることを直接 assert する | t405 宣言漏れ/過剰宣言ケース |
| BR-P3 | **機械補正 red→green(u4 AC2 / FR-3)**: 宣言漏れ状態から flagless updateModelMap が宣言を解決集合へ補正し再 check が緑、再実行は MODEL_UNCHANGED(冪等) | t405 補正ケース |
| BR-P4 | **aux identity 三者一致(u4 AC3)**: updateModelMap 計算値 = loader 照合値 = canonicalIdentity 直接計算 | t405 AC3 ケース |
| BR-P5 | **resolver fail-closed red**: 循環参照で check が `declaration-unresolved` 赤(黙って緑にしない) | t405 resolver 失敗ケース |
| BR-P6 | **latch 拡張 red**: aux 変化・宣言不一致下の --impl-only が INVALID_ARGUMENT、entries-only 成功時の非 entries フィールド同値 pin | t380 拡張3ケース |
| BR-P7 | **非接触・既存 green(u4 AC4)**: AsImplemented/Vacuity grep 証明、typecheck / lint / 既存テスト green、patch gate 0-hit 不許容、テストは修正と同 PR | CI + code-summary |

## 矛盾チェック

- BR-SU1(宣言不一致で起動)と BR-IO2(宣言不一致で --impl-only 拒否): 表面だけ相反に見えるが、起動条件は経路ごとの契約 — flagless は「宣言を含めて正す」経路、--impl-only は「entries 以外に触れない」宣言の経路であり、宣言不一致の補正は entries 以外に触れるため latch 経路では許さない。両者は補完関係(拒否 detail が flagless を指す)。
- BR-SC4(findings に集合 detail を載せない)と u1 BR-C3(detail に両集合): u1 の義務は「比較結果が集合を保持する」ことであり、消費側のエラー体系への変換は消費側の責務(u1 domain-entities §6 のライフサイクル記述どおり)。sensor の公開形状を変えない判断はこれと整合し、集合診断は loader detail(BR-D2)が担う。
- BR-MD2(traceStateVariables は暫定順)と pin の固定性: vocabulary は pin 照合対象外(ADR-6)のため、u5 実測で順序が変わる場合の修正は identity を動かさず安全。暫定値を pin するのは mirror-model-registration の語彙 pin であり、u5 での変更は同 pin の追随で扱う(u3 §1.2 留意の確定どおり)。
