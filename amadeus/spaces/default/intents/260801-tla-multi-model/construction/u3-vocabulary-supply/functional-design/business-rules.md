# Business Rules — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): unit-of-work(u3 節・AC1〜4, テスト割当節), unit-of-work-story-map(FR→Unit 写像 — stories 未生成の代替), requirements(FR-4 / FR-6, NFR-1/2/4), components(C4 / C5 / C8), component-methods(C1 / C4 / C5 節), services(S2 / S4), decisions(ADR-3 / ADR-5 / ADR-6 / ADR-10), u2 functional-design(BR-S1〜S5 / BR-I1〜I3 / BR-I4), 実測ソース(business-logic-model.md 冒頭と同じ)

unit-of-work-story-map は FR 写像表(stories なし)であり、u3 帰属は FR-4(語彙/byte-pin)/ FR-6(pin)で本書の規則由来と一致する。詳細なアルゴリズム・型定義は business-logic-model.md / domain-entities.md を参照。本書は合格/不合格を一意に判定できる規則と red 実証の義務を固定する。

## 語彙供給規則(BR-V: Vocabulary — ADR-5 / ADR-6)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-V1 | モデル別語彙(invariant 名集合・状態変数タプル)の**唯一の源は model-map.json の `vocabulary` フィールド**。コード側に語彙の既定値・複製を残さない — `TLA_NAMED_INVARIANTS`(tla-arm.ts:322-330)と `TRACE_STATE_VARIABLES`(tlc-toolchain.ts:418)の定数は削除する | fail = コード内に語彙リテラル・フォールバック既定値が残る(map と2箇所管理) | ADR-6, component-methods C4, u3 AC1 |
| BR-V2 | 語彙は loader(u2)の `VerifiedModelSource.model` 経由でのみ arm/toolchain へ配給する。toolchain・arm が model-map.json を直接読む経路は作らない。語彙解決(`namedInvariantsFor` / `traceVocabularyFor`)は parse 済み `ModelMapModel` を受け取る純粋関数で、ファイル I/O を持たない | fail = toolchain/arm から map ファイルへの読込経路の新設 / 語彙解決に I/O が混入 | ADR-6, services S4, component-dependency 規則 |
| BR-V3 | **vocabulary 省略モデルの語彙要求は明示失敗**(fail-closed)。失敗分類は既存の `MODEL_MAP_INVALID`(kind MODEL_LOAD)を使い、空配列・既定値・他モデル語彙への silent fallback は禁止 | fail = 省略モデルで空配列/既定語彙/先頭モデルの語彙を返す | u3 AC2, ADR-6, NFR-2 |
| BR-V4 | 語彙解決の失敗分類に新しいエラー kind/code を追加しない。`namedInvariantsFor` / `traceVocabularyFor` の失敗は MODEL_LOAD 系に載せ、toolchain 内の語彙不一致は従来どおり `failed("GRAMMAR", …)` | fail = 新エラー列挙の追加(u2 BR-I4 の不変方針違反) | NFR-1, u2 BR-I4, component-methods C4 |
| BR-V5 | invariant 集合は**モデルごとの閉集合**として供給する。全モデル共通の和集合で緩めない — そのモデルの語彙にない invariant 名を受理してはならない | fail = モデル A の語彙でモデル B の invariant 名が受理される(偽陰性) | ADR-5(却下案 a), u3 AC2 |
| BR-V6 | `moduleName`(トレースラベル regex のモジュール名)は map に語彙フィールドとして持たず `model.name` から導出する。regex 埋込みはエスケープする | fail = map と model name の2箇所宣言(ドリフトの温床) / 未エスケープ埋込み | 設計決定(business-logic-model §2.2/§3.2) |

## 語彙値 pin 規則(BR-P: Pin — FR-6 / u3 AC1)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-P1 | FormalElection の語彙値は**現行定数と一字一致**(順序含む): namedInvariants 7件(`ChoiceWinner` / `UnknownChoiceRejected` / `ReceivedAtAxis` / `InvalidTimestampRejected` / `AmendSubmission` / `UnknownRefRejected` / `PerVoterResolution`)、traceStateVariables 7件(`initialBudget` / `amendBudget` / `accepted` / `holdMarkers` / `holdBudget` / `tally` / `reexamRequired` — tlc-toolchain.ts:418 のタプル順で、TLA VARIABLES 宣言順とは異なる) | pass = t404 の deep-equal pin green。fail = 値・順序・件数のいずれかの差異 | FR-6, u3 AC1, ADR-5 |
| BR-P2 | MirrorLifecycle の語彙値(宣言は u4 所有): namedInvariants 3件(`TypeOK` / `NoCloseWithoutLandedSync` / `NoDuplicateCreate` — cfg:6-8 実測の宣言順。`CloseUnreachable` は cfg INVARIANT 未宣言のため含めない)、traceStateVariables 3件(`receipts` / `issueNumber` / `boundaryIdx` — VARIABLES 実測。タプル順の最終確定は u5 実測) | pass = t404 fixture ケースでこの値集合が供給される。fail = cfg 未宣言の invariant 混入 / 変数の欠落・過剰 | ADR-5, cfg/tla 実測 |
| BR-P3 | 語彙値の機械的保護は **t404 の pin テスト**が担う。vocabulary は drift pin(identity 照合)の対象外(ADR-6 の限定)であり、語彙を変更すると t404 が落ちる構成を維持する | fail = 語彙変更がどのテストも落とさない状態(保護の空洞化) | ADR-6, u3 AC1 |
| BR-P4 | model-map.json への変更は **FormalElection エントリへの vocabulary 追加のみ**。identity 値・entries 配列・他エントリ(MirrorLifecycle)・schemaVersion は不変(ADR-3 非侵襲 optional、ADR-10)。MirrorLifecycle の vocabulary/auxiliaries 追記は u4 スコープ | fail = identity 値・entries・MirrorLifecycle エントリの変更 / u4 スコープ侵食 | ADR-3, ADR-10, unit-of-work 共通契約 |

## frozen model binding 規則(BR-F: Frozen — ADR-10)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-F1 | `hasFrozenModelOutputBinding`(tlc-toolchain.ts:492-496)は **FormalElection スコープのまま一般化しない**。`expectedModuleName === "FormalElection"` / パス末尾 `FormalElection.tla` / 標準モジュール dir の絶対パス検査の3条件を一字も変更せず、「一般化対象外」をコメントで明示する | pass = 同関数の diff ゼロ(コメント追加のみ可)。fail = モデル名の引数化・緩和 | ADR-10, u3 AC1 |
| BR-F2 | `generateFrozenTlaModel` / `createFrozenTlaModelReceipt` / `validateFrozenTlaModelReceipt` の **semantics は不変**: profileIdentity の計算入力、receipt キー集合、closed-set 検査、identity 計算式(domain 文字列含む)は変更しない。変更は語彙の出所(コード定数 → map 宣言)と loader 複数形追随のみ | pass = 固定 publicContractIdentity に対する receipt identity が前後で byte 一致(t404 pin)。fail = receipt identity の変化 | ADR-10, FR-6, u3 AC1 |
| BR-F3 | frozen model の選択は `selectVerifiedModel(sources, "FormalElection")` の**明示的固定**とする。暗黙の先頭要素選択・「実行モデル」概念の持ち込みは禁止(u2 BR-S1 の踏襲)。このリテラルは ADR-10 の具現化であり一般化漏れではないことをコメントで明示する | fail = 先頭要素依存 / 要求モデルへの frozen 生成の拡大(u5 判断の先取り) | ADR-10, u2 BR-S3 |
| BR-F4 | frozen receipt の invariant キー集合(namedInvariantFormulas / invariantSourceMap)は**語彙集合と一致**する。語彙解決失敗時は frozen 生成も失敗する(語彙なしに receipt を生成する経路を作らない) | fail = 語彙集合と receipt キー集合の不一致があり得る構造 | 設計決定(business-logic-model §4.2/§4.3) |

## 反例・トレース検査規則(BR-G: Grammar — semantics 保存)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-G1 | 反例変数列検証は**数の一致 + 順序一致**の semantics をモデルごとに保存する(:439-440 / :515-516)。検査対象が定数から `vocabulary.traceStateVariables` へ変わるだけで、比較規則は一字不変 | fail = 部分一致・順序無視への緩和 | component-methods C4, FR-4 |
| BR-G2 | トレースラベル regex の grammar(アクション名識別子・行/桁 span・`of module <Name>` 構造)は不変。一般化はモジュール名の埋込みのみで、ordinal=1 の `<Initial predicate>` 受理もモデル非依存で不変 | fail = grammar 本体の緩和・変更 | tlc-toolchain.ts:420-424 実測コメント, FR-4 |
| BR-G3 | 変数列不一致・トレース不正は従来どおり: parseTrace は `null` → `failed("GRAMMAR", …)`、initial-state 反例は `failed("GRAMMAR", …)`。失敗分類を変えない | fail = 失敗 kind/code の変化(既存 red ケースの期待値破壊) | NFR-1, component-methods C4 |
| BR-G4 | **未知 invariant 名の拒否 semantics はモデルごとに保存**: TLC が報告した invariant 名がそのモデルの `vocabulary.namedInvariants` に含まれなければ `failed("GRAMMAR", "counterexample invariant is outside the frozen set")`(:475 / :511 と同じ分類・同じメッセージ) | pass = t404 の和集合拒否ケース green。fail = 未知名の受理 / メッセージ・分類の変更 | u3 AC2, ADR-5 |
| BR-G5 | ライフサイクル検証(:390-416)・統計/深度 payload・完了マーカー regex(:448-451)・反例ヘッダ grammar(:472-473 / :508-509)・counterexampleIdentity 計算式(:484 / :525)には触れない | fail = これらの semantics への手付かずの変更 | NFR-1, ADR-10 |

## byte-pin 規則(BR-B: Byte-pin — C5)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-B1 | byte-pin は「要求モデル名で `selectVerifiedModel` 選択 → 選択モデルの `moduleBytes` / `cfgBytes` と要求バイトを `sameBytes` 照合」。照合 semantics(誤バイトは SOURCE_DRIFT 赤、メッセージ文字列含む)は :118-127 から不変 — 一般化は照合相手の選択のみ | fail = 照合の緩和 / メッセージ変更(既存 red 期待値の破壊) | components C5, services S4, u3 AC3 |
| BR-B2 | **未登録モデル名の要求は明示失敗**(MODEL_LOAD / MODEL_MAP_INVALID、u2 BR-S3)。モデル名は要求 modelPath の basename から導出し、silent fallback・先頭モデルへの黙示既定は禁止 | fail = 未登録要求で他モデルへ黙って落ちる / 緑を返す | NFR-2, u3 AC3 |
| BR-B3 | `publicContractIdentity` = sha256(選択モデルの entries sha256 を `"\n"` join)の**計算式は不変**。参照が `executionModel.entries` から `selected.model.entries` へ変わるのみ | pass = FormalElection 要求で receipt identity 不変。fail = 計算式の変更 | ADR-10, run-model-check-source.ts:129-131 実測 |
| BR-B4 | `RunModelCheckSource.source` は `VerifiedModelSource` 型となり、`vocabulary: TraceVocabulary` を保持して toolchain 正規化の入力語彙として配給する(services S4-(3))。toolchain はこの語彙以外の出所を参照しない | fail = toolchain が語彙を別経路(定数・map 直読み)から取得 | services S4, ADR-6 |

## Red 実証の義務(u3 AC との対応)

| # | 義務 | 実証先 |
|---|---|---|
| BR-R1 | **FormalElection 語彙 pin(u3 AC1)**: map 供給語彙が現行定数と順序含め一字一致。frozen receipt identity 不変 | t404 pin ケース + 既存 identity 定数 pin の期待値不変 green |
| BR-R2 | **vocabulary 省略 red(u3 AC2、落ちる実証)**: 語彙省略モデルの TRACE 解析要求が明示失敗。未知 invariant 名拒否の保存(和集合緩和なし) | t404 省略 red ケース + 和集合拒否ケース |
| BR-R3 | **byte-pin 選択一般化(u3 AC3)**: 要求モデル名で選択・照合、未登録要求は明示失敗、誤バイトは従来どおり赤 | run-model-check-source 統合の新規ケース |
| BR-R4 | **MirrorLifecycle 語彙の正しさ(fixture)**: §BR-P2 の値で regex 受理/拒否・変数列検査が双方向に機能 | t404 MirrorLifecycle fixture ケース |
| BR-R5 | **コード既定値削除の実証**: `TLA_NAMED_INVARIANTS` / `TRACE_STATE_VARIABLES` の残余参照なし(grep ガード)+ `bun run typecheck` green | t404 grep ガード + typecheck |
| BR-R6 | **patch gate / 既存 green(u3 AC4)**: 変更行 0-hit 不許容、typecheck / lint / 既存テスト green、テストは修正と同 PR | CI |

## 矛盾チェック

- BR-V1(コード既定値の削除)と BR-F2(frozen 系 semantics 不変): frozen 生成は語彙を必要とするが、値は map から FormalElection 明示選択で供給される(BR-F3)。「コードに定数を残さない」と「frozen を FormalElection 語彙に固定」は、選択の固定(モデル名リテラル)と語彙値の出所(map)を分ければ両立する — リテラルはモデル名のみで語彙値は含まない。
- BR-P4(u3 は FormalElection エントリのみ変更)と BR-P2(MirrorLifecycle 語彙の確定): MirrorLifecycle の語彙**値**は本書で確定するが、map への**宣言**は u4 が行う。t404 の MirrorLifecycle ケースは実 map ではなく fixture で検証するため、u3 単体で緑を構成できる(u2 BR-D6 と同じ fixture 分離の構造)。
- BR-F1(binding 一般化しない)と FR-4(TLC 実行系の複数モデル対応): parseTlcOutput174 の入口は frozen receipt 必須のままなので、MirrorLifecycle の TLC 証跡正規化はこの入口では成立しない。これは見落としではなく ADR-10 の適用結果であり、MirrorLifecycle の正規化経路は u5 の設計事項として引き渡す(business-logic-model §3.5/§9.2)。u3 の AC は全て FormalElection 不変 + 語彙供給経路の確立で閉じる。
