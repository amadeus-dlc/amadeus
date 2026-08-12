# Requirements — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: requirements-analysis (2.3) / **Depth**: Standard / **Date**: 2026-08-10

上流入力(consumes 全数): `intent-statement.md`(Problem/Success Metrics/未決3点の正本 — 本書の Intent analysis と FR 群の導出元)、`scope-document.md`(能力13項目の In/Out 境界と4層依存 — FR のグルーピングと Out of scope 節の正本)、codekb `business-overview.md`(プロジェクトの配布モデル前提)、codekb `architecture.md`(core 中立層/harness 表層境界 — 変更面の所属判定)、codekb `code-structure.md`(protocols/tools/skills の配置 — FR の対象パス確定)。RE 断面の実測は `re-scans/260810-grilling-frontier-resync.md`(observed `5564dccd1`)に依る。

## Intent analysis

grilling(Grill me モード / `/amadeus-grilling`)の終了条件を「質問数の予算」から「論点ツリーの被覆完了(frontier 駆動)」へ再定義する。上流 mattpocock/skills の現行 grilling(ピン SHA `1495d014303e041c51c29f9e442485ba06f5878d`、MIT)を骨格として逐語採用し、Amadeus 契約(depth = 枝刈りの materiality 閾値、standalone 専用 Free、回路遮断器、質問ファイル・監査契約)を overlay として分離する。

ゴールは機能追加ではなく**存在意義の回復**: 現行 D6 のハード上限(4/8/12)では10領域級の設計議論が1領域1問強で打ち切られ、grilling が選択式 Guide me と同質化している(#2785、クロスレビュー2名 CONFIRMED_WITH_REFINEMENTS)。#2063/#1999 が守った「セッション長の有界性」は、終了条件ではなく回路遮断器+毎ラウンド人間ゲートとして保存する — 対立軸は「被覆保証 vs セッション長の有界性」であり両立させる。

**要件段裁定(質問票 2026-08-10T04:43:11Z、全てユーザー裁定)**: (a) Free = standalone 専用パラメータ(depth 機械語彙3値は不変) (b) Grill me は §8 :729 の recorded-justification 条項へ接続(数値上限は他モード不変) (c) semi/full 自律中はモード選択肢から Grill me を明文除外。

## Functional requirements

### A. 正本 — grilling-protocol.md(PU-1)

- **FR-PROTO-1: 上流骨格の逐語採用** — #2785 本文にピンされた原文(`1495d014`、sha256 `fa5c1e5ee76b1c8f1ae56101f52c9e239de75d5c578adc61227b92d10b7e52ef`、1872 bytes)を骨格として `grilling-protocol.md` を書き直す。骨格テキストは protocol 内で連続ブロックとして識別可能に置く(overlay と交互に刻まない)。受け入れ基準: 骨格ブロックを機械抽出してピン原文と `diff` → 空(exit 0)。抽出手順(行範囲 or マーカー)を protocol 内に自己記述する。
- **FR-PROTO-2: 帰属ヘッダの SHA 記録** — 既存 MIT 帰属ヘッダ(現行 :2-5)に取り込み元コミット `1495d014303e041c51c29f9e442485ba06f5878d` を追記する。受け入れ基準: ヘッダにフル SHA が grep で1 hit。
- **FR-PROTO-3: 骨格/overlay の2層分離** — Amadeus 契約(depth 閾値・遮断器・質問ファイル/監査写像・§4 Workflow vs Standalone)は overlay 節として骨格の後に置き、骨格の文言を書き換えない。受け入れ基準: FR-PROTO-1 の diff 空+レビューで overlay 節が骨格語彙を再定義していないことを確認。
- **FR-PROTO-4: D1(1問ずつ)の廃止と rounds/frontier の採用** — 質問は design tree の frontier をラウンド一括提示する(骨格の規定どおり)。同一ラウンドに入るのは相互独立な質問のみ。受け入れ基準: 改訂後 protocol に「one at a time」を義務付ける規則が存在しない(grep 0 hit — 骨格自身の説明文は除く)。
- **FR-PROTO-5: 終了条件の置換** — D6 相当を「(枝刈り後の)frontier が空になったとき、または `done`」へ置換する。質問総数は創発値であり終了条件に使わない。受け入れ基準: FR-CONTRACT-6 の t415 改訂で新文言を逐語 pin、旧文言(`Do not offer continuation beyond the total ceiling`)は `not.toContain` で復活禁止。
- **FR-PROTO-6: depth = materiality 閾値表** — Minimal(実装ブロック・不可逆のみ)/ Standard(+実質的トレードオフ)/ Comprehensive(+エッジ・拡張点・運用細部)の枝刈り表を overlay に定義する。depth はツリーに入るノードの閾値であり質問数上限ではない。受け入れ基準: 表の存在+FR-CONTRACT-2 の §8 接続段落との相互参照。
- **FR-PROTO-7: 刈りノードの明示列挙** — 閾値未満で刈ったノードは合意サマリ(C-4 相当)に「閾値未満として明示的に先送りした点」として列挙する。Free では刈りが発生しないため列挙は空でよい(空の明示は必要)。受け入れ基準: テンプレートに deferred 節+FR-CONTRACT-4 のセンサー検査対象。
- **FR-PROTO-8: 回路遮断器** — depth 指定時(M/S/C)のみ、総質問数が従来目安の3倍(Minimal 12 / Standard 24 / Comprehensive 36)に達したら「ツリー未完走」を明示開示して停止する。silent な打ち切りが被覆完了を装うことを禁止する。Free は適用外(安全弁は毎ラウンド人間ゲートと `done`)。受け入れ基準: 落ちる実証 — 遮断器発火ケースを注入して赤(明示開示)を実測するテスト。【裁定 2026-08-10(BLOCKER B、ユーザー裁定・申告付き改訂)】本 AC の機械面は C3 センサーの事後検査の落ちる実証(FR-CONTRACT-4 の「マーカー付き超過+記録なし=FAIL」態)で充足すると確定する — 遮断器は C1 が定義する会話時の規律であり(component-methods.md:18「C3 は遮断器を消費しない」)、コード側に注入・観測面を持たない。会話時の遮断器発火自体の検証は FR-DOG-1(dogfood 実走)が担う。
- **FR-PROTO-9: 質問ファイル・監査契約の維持(workflow 面)** — ラウンド一括提示でも、質問ファイルへの追記(提示前・blank `[Answer]:`)と書き戻し・監査イベント(decision/answer)は1問1件の既存様式を維持する。受け入れ基準: overlay に annex 写像の規定(1コール複数問可のハーネスはラウンド一括、不可のハーネスは同一ラウンド内連続提示 — ラウンド境界の意味論は保存)。
- **FR-PROTO-10: 事実の非同期自己調達** — 骨格の「facts via sub-agents, don't block」を既存 D3/D4(事実は自己調達、確定不能は confidence 付き estimate)へ接続する。受け入れ基準: overlay に D3/D4 相当の規定が残存し、骨格の sub-agent 記述と矛盾しない。

### B. 契約面 — stage-protocol / センサー / directive / テスト(PU-2)

- **FR-CONTRACT-1: Step 3d の改訂** — `stage-protocol.md:349` の要約(`one question at a time` / `hybrid termination`)を frontier 駆動の新契約(rounds・枝刈り閾値・frontier 空終了)の要約へ差し替える。受け入れ基準: `hybrid termination` が stage-protocol.md で grep 0 hit。
- **FR-CONTRACT-2: §8 への接続段落** — §8 Depth-Level Contract(:726-746)へ「Grill me モードは depth を枝刈り閾値として消費する。質問総数が本表の数値上限を超える場合、:729 の recorded-justification 条項の常設形として、超過理由(frontier 駆動)を質問ファイルへ機械記録する。回路遮断器(目安×3)が超過の上界」の1段落を追記する(裁定 (b))。数値上限の表自体・他モードへの適用は不変。受け入れ基準: §8 の既存数値行が diff で不変+新段落の存在。
- **FR-CONTRACT-3: depth 機械語彙の不変** — `VALID_DEPTH_VALUES`(amadeus-directive.ts:62)は3値のまま変更しない(裁定 (a))。Free は wire・state・workflow depth に現れない。受け入れ基準(静的契約につき検証手段を明示): 契約テストで `VALID_DEPTH_VALUES` が `["Minimal", "Standard", "Comprehensive"]` の3値であることと、grilling 改訂ファイル群に `"Free"` を depth として流す記述が無いことを assert。
- **FR-CONTRACT-4: question-budget センサーの grilling モード対応** — (i) questions ファイル冒頭の機械可読マーカー(grilling モード宣言)を定義し、マーカー付きファイルでは数値検査を justification 検査(超過記録行の存在+刈りノード列挙の存在(空明示可))へ切り替える (ii) 未知 depth 値の `no-depth, pass:true` fail-open を「未知値は loud warning finding」へ封鎖する(裁定 (a) の封鎖面)。受け入れ基準: センサーテスト3態 — マーカー付き超過+記録あり=PASS / マーカー付き超過+記録なし=FAIL / 未知 depth=warning finding(落ちる実証込み)。
- **FR-CONTRACT-5: semi/full 下の Grill me 除外** — stage-protocol §3 のモード選択規定に「semi/full 自律が有効な間、対話モード選択肢に Grill me を含めない(grilling は human-in-the-loop 前提)」を追加する(裁定 (c))。受け入れ基準: 明文の存在+契約テストで文言 pin。
- **FR-CONTRACT-6: t415 の明示改訂** — `t415-interaction-budget-contract.test.ts` の grilling 関連 pin(:36-45)を新契約の逐語 pin へ差し替える。旧 D6 文言・`Continue` ラベル・`8-12+` の復活禁止 pin は維持し、`hybrid termination` の復活禁止 pin を追加する。stage-protocol 側 pin(:26-33)は §8 数値不変のため原則不変。受け入れ基準: 改訂後 t415 が green+改訂前 t415 × 改訂後正本が赤(対角実測 — 明示改訂の実効証明)。

### C. 投影 — スキル / prose / docs(PU-3)

- **FR-PROJ-1: `/amadeus-grilling` スキル改訂** — standalone 規則を frontier 駆動へ書き直し、独自レベル引数(Minimal/Standard/Comprehensive/**Free**)を定義、**既定 = Free**(裁定 (a)。#2785: 単体利用は上流と同一挙動)。明示レベル指定時のみ枝刈り+遮断器が有効。受け入れ基準: SKILL.md の既定記述+t415 の standalone pin(`default to Standard (8)`)を新既定の pin へ差し替え。
- **FR-PROJ-2: prose 消費者の全数更新** — 検索は**大小文字非区別**(`git grep -in`)で行う(レビュー i1 BLOCKER の是正: 大小文字区別述語は "One question at a time" を構造的に不検出)。対象は (i) 小文字形の7ファイル8行(docs/guide 5・conductor.md:51・stage-protocol.md:349・SKILL.md:5) (ii) 文頭大文字形の6箇所 — `stage-protocol.md:277`(モード選択の Grill me 説明文・毎回ユーザー可視、最優先)、`docs/reference/04-stage-protocol.md:294` / `.ja.md:244`(質問 spec 例)、`docs/guide/14-artifacts-reference.md:208`、`docs/guide/16-worked-examples.md:102` / `.ja.md:115` (iii) 対訳側の実語彙「一度に1質問」(docs/reference/04-stage-protocol.ja.md:264 — 直訳キーでは不可視、cid:reverse-engineering:c1-translation-pair-vocabulary-key)。すべて frontier 語彙へ更新する。受け入れ基準: `git grep -in "one question at a time"` と対訳キーの再実行で旧語彙 0 hit(en/ja 対で確認)。
- **FR-PROJ-3: docs の hybrid 残存の自然消滅** — `docs/reference/04-stage-protocol.md:320` / `.ja.md:264` の hybrid 記述を新契約の記述へ更新する(intent-capture Q3 裁定: 独立修正でなく書き直しの一部)。受け入れ基準: `hybrid termination` / `ハイブリッド終了` が docs/ で grep 0 hit。
- **FR-PROJ-4: 配布面の再生成検証** — `bun run build` 再生成+`bun run source-only:check`+隔離2回ビルド再現性検査+t199(distribution)green。t199 は dist を読むため正本編集後のリビルドを検証手順に含める(RE 所見3)。受け入れ基準: 各コマンドの exit 0 実測。

### D. 受け入れ実走・着地(PU-4/5)

- **FR-DOG-1: dogfood 実走** — Rust ナレッジ設計議論(10領域)を standalone Free モードで「全分岐訪問済み」まで1セッションで完走する(intent-capture Q2 裁定)。合意サマリと(Free のため空の)刈りノード列挙を実確認する。受け入れ基準: 実走の完走記録(ラウンド数・質問総数・frontier 空の宣言)を record へ残す。
- **FR-LAND-1: 着地後報告** — #2683 へ L2 変更(grilling の終了意味論変更)の反映報告コメント、#2785 のクローズ判定(close-after-landing-verification — マージ着地の grep/実読確認後のみ)。受け入れ基準: コメント URL とクローズ根拠の記録。

## Non-functional requirements

- **NFR-1: 監査互換** — 質問・回答の監査イベント(decision / answer / QUESTION_ANSWERED)の形式・粒度(1問1件)は不変。既存の監査消費者(センサー・リプレイ)を壊さない。検証: 既存 answer-evidence センサーが改訂後の questions ファイルで PASSED。
- **NFR-2: 配布同一性** — 全ハーネス投影で同一の protocol が配布される(t199 維持)。検証: FR-PROJ-4。
- **NFR-3: 将来の上流再同期性** — 骨格逐語+overlay 分離により、上流の次回進化を骨格差分だけで追随できる構造を保つ。検証: FR-PROTO-1 の機械抽出手順が上流新版との diff にそのまま使えることをレビューで確認。

## Constraints

- **source-only 境界**: 正本は `packages/framework/core/` のみ編集、dist/self-install は `bun run build` 再生成(コミット面でない)。
- **closed vocabulary**: `VALID_DEPTH_VALUES` 3値不変(裁定 (a))。
- **#2063/#1999 裁定の保存**: セッション長の有界性という動機は回路遮断器+超過の機械記録として引き継ぐ(撤回ではなく再実装)。
- **MIT 帰属**: 帰属ヘッダ維持+取り込み SHA 追記(FR-PROTO-2)。
- **pinned-behavior 規律**: t415 の改訂は本要件(FR-CONTRACT-6)が仕様裁定とセットで確定する — 実装段の単独判断で pin を触らない。
- **#2683 との境界**: §8 の数値上限表と他モードの適用は不変(intent-capture Q1 裁定の Out 境界)。

## Assumptions

- ハーネスの構造化質問レンダリングは1コールで複数問を提示できる(Claude Code の AskUserQuestion は最大4問/コール — ラウンドが4問を超える場合は同一ラウンド内で分割提示し、ラウンド境界の意味論は保存する)。根拠: 本セッションでの実使用。
- 上流ピン原文は #2785 本文に固定済みで、実装時に upstream main を再取得しない(#2785 採用方針)。
- question-budget センサーの cutoff 機構(260809)は既存のまま — 新検査(justification)にも同じ cutoff 意味論を適用する。
- standalone grilling は従来どおり監査イベントを出さない(read-only 分類不変)— dogfood の完走記録は会話とファイル出力(ユーザー明示依頼時)で残す。

## Out of scope

`scope-document.md` の Out 境界を正とする: #2683 L2 行(数値上限の全体アーキテクチャ)自体の改訂 / #2063 の bounded review 契約の grilling 外の面(reviewer イテレーション予算等) / 既存 drift の独立修正・別 Issue 起票 / 上流リポジトリへの貢献。加えて: 他モード(Guide me / Edit / Chat)の対話意味論の変更、depth 系の他センサー(depth-budget / nfr-budget)の変更。

## Open questions

- t528 を共有する2テストファイルの真偽(重複採番か単体/統合バリアントか)— RE の loose thread。本 intent の採番は t530 以降を予約済みで、PR 発行前・マージ直前に固定 base SHA で再確認する(cid:code-generation:c1-tnnn-collision-on-regrounding)。
- 遮断器発火時の「ツリー未完走」開示の様式(合意サマリへの節追加 or 専用メッセージ)は functional-design で確定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T04:57:41Z
- **Iteration:** 1
- **Scope decision:** none

REVISE: FR-PROJ-2 の prose 棚卸しが大小文字区別 grep により6箇所(新規4ファイル+既知2ファイルの追加行、stage-protocol.md:277 のモード選択説明文を含む)を構造的に見落とし、受け入れ基準の同一述語再利用で偽 green になる。NIT: FR-CONTRACT-6 に簡体字混入。裁定転記・機構引用・トレーサビリティ・テスト可能性は全数照合で健全

### Findings

- BLOCKER | FR-PROJ-2 の検索述語が大小文字区別で 'One question at a time' を不検出 — stage-protocol.md:277(モード選択の Grill me 説明文・毎回ユーザー可視)、docs/reference/04-stage-protocol.md:294 / .ja.md:244、docs/guide/14-artifacts-reference.md:208、docs/guide/16-worked-examples.md:102 / .ja.md:115 の6箇所がインベントリ外。受け入れ基準の grep も同述語のため偽陽性 green になる。是正 = 述語を -i 化しインベントリへ6箇所追加、re-scans §7 の述語穴も併記
- NIT | requirements.md FR-CONTRACT-6 の『维持』は簡体字 — 『維持』へ修正(言語規約違反)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T05:03:47Z
- **Iteration:** 2
- **Scope decision:** none

READY(GoA 1): i1 の BLOCKER(FR-PROJ-2 述語)と NIT(簡体字)の閉包を独立 grep で確認。-i 述語での全数 12ファイル14行と FR-PROJ-2 列挙が file:line 完全一致、簡体字は正字化済み(履歴引用の1 hit は正当)。FR-PROJ-2/3・FR-CONTRACT-1 の対象重複は整合的で新規矛盾なし。NIT 1件(re-scans の合計表記 11→12)は conductor が即時訂正済み

### Findings

- NIT | re-scans 訂正節の合計表記 11ファイルは機械再計算で 12ファイル(stage-protocol.md が両形式に出現) — conductor が同一ターンで訂正済み
