# Business Rules — u1-schema-resolver

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u1-schema-resolver(C1+C2)

上流入力(consumes 全数): unit-of-work(u1 節・AC1〜4), unit-of-work-story-map(FR→Unit 写像 — stories 未生成の代替), requirements(FR-1 / FR-2, NFR-1/2/4), components(C1 / C2), component-methods(C1 / C2 節), services(S3), decisions(ADR-1 / ADR-2 / ADR-3 / ADR-6 / ADR-7), 実測ソース(business-logic-model.md 冒頭と同じ)

unit-of-work-story-map は FR 写像表(stories なし)であり、u1 帰属は FR-1 / FR-2 で本書の規則由来と一致する。詳細なアルゴリズム・型定義は business-logic-model.md / domain-entities.md を参照。本書は合格/不合格を一意に判定できる規則と red 実証の義務を固定する。

## スキーマ規則(BR-S: Schema — C1)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-S1 | `auxiliaries` / `vocabulary` は optional。省略モデルは従来形の exactObject 分岐に入り、パース結果・identity 値は変更前と byte 一致する | pass = 省略モデルのパース戻り値が現行テストの期待値と不変。fail = 何らかの値・形状の変化 | ADR-3, 成功 (iii), NFR-1 |
| BR-S2 | モデルの許可キー集合は4形のみ(基底 / +auxiliaries / +vocabulary / +両方)。これ以外のキー組合せは全て拒否 | fail = `MODEL_MAP_INVALID`(未知キー・必須キー欠落は従来どおり赤) | ADR-3, u1 AC1 |
| BR-S3 | `auxiliaries` は非空配列。空配列は省略と区別して拒否する | fail = `MODEL_MAP_INVALID`(空配列) | component-methods C1, ADR-3 |
| BR-S4 | aux 各要素はちょうど `{path, identity}`。path は `specs/tla/<Name>.tla` 形(`Name` は TLA モジュール識別子文法)、正規化済み・絶対/traversal/バックスラッシュ不含、`.cfg` 等他拡張子・`specs/tla/` 外は拒否 | fail = `MODEL_MAP_INVALID`(AC1 の境界外負例全件) | FR-1, components C1 |
| BR-S5 | aux の path は自モデルの model path と一致してはならない(自己 aux 禁止) | fail = `MODEL_MAP_INVALID` | 設計決定(リゾルバの自己参照 fail-closed と整合) |
| BR-S6 | aux の identity は小文字 SHA-256(64桁 hex)。aux 要素の path は一意かつ昇順ソート | fail = `MODEL_MAP_INVALID`(非 canonical identity / 重複 / 非ソート) | FR-1(Q1=A の canonical 前提), component-methods C1 |
| BR-S7 | `vocabulary` はちょうど `{namedInvariants, traceStateVariables}`。各配列は非空・全要素が TLA 識別子・一意。語彙の値の正しさはスキーマ層で判定しない | fail = `MODEL_MAP_INVALID`(未知キー / 空配列 / 非識別子 / 重複) | ADR-6, components C1 |
| BR-S8 | スキーマ由来の失敗は全て既存 `invalid(...)` 経路(`MODEL_MAP_INVALID`, relativePath = `specs/tla/model-map.json`)。新規エラーコードを追加しない | pass = 既存 `ModelLoadErrorCode` 列挙の不変 | NFR-1 |
| BR-S9 | byte-identical 2 複製(`packages/framework/core/tools/` と `plugins/formal-model-check/tools/` の `amadeus-formal-verif-model-map.ts`)は同一 byte で同時更新する。shim `tla-model-map.ts` は型 re-export の追加のみ | pass = `cmp` exit 0 + dual-copy テスト表の両側 green。fail = 片側のみ更新(表の片側が落ちる) | components C1 留意, u1 AC4 |

## リゾルバ規則(BR-R: Resolver — C2)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-R1 | 抽出はブロックコメント(`(* … *)`、ネストなし)除去 → 行コメント(`\*` 以降)除去 → キーワード行走査の順序固定。コメント内の EXTENDS/INSTANCE 様テキストは一切採用しない | pass = コメント内の偽キーワードが結果に入らない(t402 偽陽性ケース)。fail = 1件でも採用 | FR-2, components C2 |
| BR-R2 | 採用対象は (a) 行頭(前置空白許容)`EXTENDS <名>, …` と (b) 行頭 `INSTANCE <名>` および `<識別子> == INSTANCE <名>`(WITH 句は改行跨ぎ含め無視)のみ。行中のキーワード文字列は採用しない | pass = MirrorLifecycle.tla:23/:31-32 の実形が正しく取れ、行中出現は無視される | component-methods C2, u1 AC3 |
| BR-R3 | TLA 標準モジュール(`TLA_STANDARD_MODULES` 固定リスト)は依存集合に入れず失敗にもしない。それ以外の参照名は specs/tla 境界で解決し、読取失敗は `MODULE_DEP_UNRESOLVED` で明示失敗 | fail = 標準モジュールを UNRESOLVED にする(偽赤)/ 未知の非標準名を黙って捨てる(偽緑) | 設計決定(business-logic-model §2.2), NFR-2 |
| BR-R4 | 循環参照(自己参照を含む)は `MODULE_DEP_CYCLE` で明示失敗。`MODEL_NAME` 文法外のモジュール名入力は `MODULE_DEP_OUT_OF_BOUNDS` で拒否 | fail = 循環を無限巡回/打ち切りで黙認する、文法外名を通す | components C2 境界, NFR-2 |
| BR-R5 | `resolveAuxiliaryModules` の出力は起点自身を除く、ソート済み・重複排除の配列。同一入力には常に同一出力(決定的) | pass = 集合が順序・重複を含め一意に正規化される | components C2 留意 |
| BR-R6 | 閉じられないブロックコメントはモジュール末尾までをコメントとみなす(寛容な解析で誤った依存を採用するより、後段の loader 照合で落ちる側へ倒す) | pass = 不正ソースで偽の依存を返さない | 設計決定(fail-closed 側への偏り) |
| BR-R7 | EXTENDS 行のカンマ区切りトークンが `MODEL_NAME` 文法に一致しない場合は構文異常として detail 付き明示失敗(黙って捨てない) | fail = 異常トークンの silent skip | NFR-2 |
| BR-R8 | リゾルバは新規外部依存を持たない。fs アクセスは注入シーム `readModule` に限定し、モジュール本体は純粋関数 | pass = import が `node:` 含めゼロ(型 import のみ許容) | NFR-4, component-methods C2 |

## 宣言照合規則(BR-C: Comparison — RA Q2=A、消費は u2/u4)

| # | 規則 | pass / fail semantics | 由来 |
|---|---|---|---|
| BR-C1 | 宣言集合(model.auxiliaries の path から導出したモジュール名集合。省略は空集合)と解決集合(resolveAuxiliaryModules 出力)の比較は**双方向**: missing = 解決 − 宣言(宣言漏れ)、extra = 宣言 − 解決(過剰宣言)。missing・extra のどちらかが非空なら不一致(red) | pass = 両者が空のときのみ緑。fail = 片方向の部分集合判定だけで緑にする(過剰宣言の取りこぼし) | RA Q2=A, ADR-2 / ADR-7 |
| BR-C2 | 比較規則の実装は u1 のリゾルバ側に単一で置き、u2(loader)/ u4(sensor)はそれを共有する(検出点は二重、実装は単一) | pass = 比較ロジックが1実装。fail = 検出点ごとの別実装(規則ドリフト) | ADR-2 |
| BR-C3 | 不一致の診断は declared / resolved / missing / extra を全て保持する(DriftReport)。エラー型への変換は消費側 | pass = detail に両集合が人間可読で現れる | components C7, u2/u4 の AC |

## Red 実証の義務(u1 AC との対応)

| # | 義務 | 実証先 |
|---|---|---|
| BR-P1 | **schema mismatch red(u1 AC1)**: aux の未知キー混入・空配列・specs/tla 境界外パス・非 canonical identity を含む model-map が全件 `MODEL_MAP_INVALID` で落ちる。負例は1件ずつ独立に赤を確認する(まとめて1ケースにして通過した振りをしない) | スキーマ表テスト拡張(t-formal-verif-model-map-v2.test.ts、dual-copy 表を含む) |
| BR-P2 | **resolver 偽陽性 red**: コメント内の偽 EXTENDS/INSTANCE を採用したら落ちるテスト(採用しないことを assert) | t402 偽陽性ケース |
| BR-P3 | **resolver 偽陰性 red**: 正当な EXTENDS/INSTANCE(前置空白・改行跨ぎ WITH 代入形)を取りこぼしたら落ちるテスト | t402 実ファイルケース + 合成ソースケース |
| BR-P4 | **fail-closed red**: 未解決・循環・文法外名がそれぞれ `MODULE_DEP_UNRESOLVED` / `MODULE_DEP_CYCLE` / `MODULE_DEP_OUT_OF_BOUNDS` で落ちる | t402 境界ケース |
| BR-P5 | **byte-identical 維持**: 2 複製の同一 byte 更新と `bun run typecheck` / `lint` / 既存テスト green(patch gate 0-hit 不許容) | u1 AC4、CI |

## 矛盾チェック

- BR-S3(空配列拒否)と「省略 = aux なし」: 矛盾しない — 省略と空配列を区別し、空は曖昧さ排除のため拒否(ADR-3)。
- BR-R3(標準モジュールの豁免)と「存在しないモジュールは明示失敗」(components C2): 表面だけ矛盾に見える。標準モジュールは TLA 言語の組込みであって specs/tla 追跡対象の資産ではないため、追跡対象名(非標準)についてのみ fail-closed を適用する形で両立させた(business-logic-model §2.2 の設計決定)。
- BR-R1(行頭縛り)と MirrorLifecycle.tla:31 の `Core == INSTANCE …` 形: 行頭が識別子で始まる代入形を採用対象に含めることで解消(BR-R2 (b))。行頭縛りを緩めるのではなく、TLA+ の INSTANCE 宣言の2書式を明示列挙する。
