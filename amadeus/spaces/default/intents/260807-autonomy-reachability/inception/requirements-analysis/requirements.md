# Requirements — autonomy-reachability(#2378)

上流入力(consumes 全数): intent-statement(Success Metrics = 完了条件6点を FR 群の親とする)、scope-document(In/Out 境界と D1/D2 裁定を継承)。business-overview / architecture / code-structure(codekb 共有断面)は本 intent の節が未合成のため直接参照に用いず、**本 intent の実測正本 `codekb/amadeus/re-scans/260807-autonomy-reachability.md`(finding 1〜12)を経由して参照する** — 本文の全 file:line 引用の出典は同 re-scan record である(共有断面の現在節は 260807-failclosed-recovery-path のもの — 装飾引用を避けるための明示、Review iteration 1 FOLLOW-UP 1 是正)。team-practices(optional consume)は practices-discovery が self-feature スコープで SKIP のため未生成 — 設計どおりの不在で、適用プラクティスは memory 層(org/team/project)を直接参照した。

**承認系譜**(cid:requirements-analysis:approval-lineage-citation): ①着手指示+クロスレビュー経路選択(ユーザー、2026-08-07)→ ②`--autonomy semi` 宣言(HUMAN_TURN 2026-08-07T11:29:58Z)→ ③D1 MoSCoW / D2 dependency-first(semi 梯子 AUTO_DECIDED、Ideation 境界でユーザー検収済み)→ ④birth 同時受理の仕様裁定(ユーザー、questions Q1、2026-08-07T13:05:00Z)。

## Intent analysis

ユーザーの目標は「宣言した自律度どおりに走行し、止まったときは理由が読める」こと。RE は到達性の欠落を3層で確定した: **宣言できない**(birth 同時拒否 — finding 1)/**宣言しても効かない**(state 投影非対称により Stop hook carve-out が開かない — finding 5・6)/**宣言が誰にも見えない**(導線が全面ゼロ — finding 8・9)。機能の新設ではなく、既存 engine 実装(#2253/#2318、t449〜t453 でテスト済み)への到達経路の是正が本質である。

## Functional requirements

### FR-1: birth 同時宣言(Must — ユーザー裁定 Q1)

- FR-1a: `/amadeus --autonomy <none|semi> "<説明>"` は birth と同時に受理し、birth 直後の同一 `next` 連鎖内で mode を適用する。適用は canonical(`applyProductionAutonomyMode`)経由とし、provenance は実 HUMAN_TURN(フラグ自体は provenance にならない — 現行 t450-branch:119 の契約を維持)
- FR-1b: `/amadeus --autonomy full "<説明>"` は birth を成立させたうえで、grant 儀式(preview 表示→明示確認)を経ずに mode を設定しない — preview 相当の表示を出して確認待ち fail-closed 停止(FR-GRT-006 不変)
- FR-1c: 現行拒否をピンする `tests/integration/t450-autonomy-flag-branch.test.ts:83`("without a state file the flag is refused")と `tests/unit/t450-autonomy-flag-apply.test.ts:95`("H0: no active intent is loud")は本仕様裁定に基づき明示改訂する(改訂前後の赤/緑と、改訂後×修正前実装の対角を記録 — cid:code-generation:c6-260803-state-integrity)
- FR-1d: 実装 seam は `amadeus-orchestrate.ts:1290-1294`(judgment 0)と Branch 4ab 配置(`:2952-2958`、コメント :2943-2946 の設計意図の改訂を含む)。受け入れ基準: 新規 intent の e2e で「birth → 最初のステージ directive が `intent_autonomy_mode` を搬送」までを1コマンドで実測固定(完了条件1)

### FR-2: 裁定不能理由の可視化と state 非対称の是正(Must)

- FR-2a: `authorizeInteraction` の拒否理由(`SCOPE_OUT` / `MODE_REQUIRES_HUMAN` の2値 — `AUTHORITY_BOUNDARY` は存在しない、finding 3)を、`autoApprove === false` の経路で audit イベントとして emit する。seam: `amadeus-intent-autonomy-production.ts:227-231`(現状 `authorizationReason` は production 消費点ゼロ — finding 2)。イベントは新設1種とし、occurrence の kind / stage / reason を属性に含める。**受け入れ基準**: (i) semi 有効下で phase-gate occurrence を発生させると新設イベントが reason=`MODE_REQUIRES_HUMAN` で audit shard に1行出現する(integration テストで audit 行を直読 assert) (ii) mode 未設定 intent の stage-gate で reason=`SCOPE_OUT` 相当の human-required 経路が同様に記録される (iii) 認可判定の戻り値は変更前後で不変(観測のみの実証)
- FR-2b: `preview-autonomy` の出力に「この mode/grant で自動裁定されない対話種別」を列挙する。実効は semi 側(`SEMI_ROUTINE_INTERACTIONS` が phase-gate / walking-skeleton を除外)。full は `ALL_INTERACTIONS` のため「なし」と表示。**受け入れ基準**: semi の preview 出力に `phase-gate` / `walking-skeleton` の2種が「人間裁定」として列挙され、full の preview では非裁定種別が空であることを CLI 出力の逐語 assert で固定
- FR-2c: state 3フィールド(`Intent Autonomy Mode` / `Intent Grant` / `Construction Autonomy Mode`)の書込を `applyProductionAutonomyMode` 側へ canonical 化し、`amadeus-bolt.ts:1075-1081` はその呼出しへ縮約する(finding 5)。受け入れ基準: C13 経由宣言後に (i) state 実読で mode 反映 (ii) `amadeus-stop.ts:196-198` の question carve-out が semi で開く (iii) statusline セグメント表示 — の3点を実測(finding 6 の解消)
- FR-2d: 読み手6系統(`amadeus-lib.ts:4942` / `amadeus-orchestrate.ts:1894-1899` / `amadeus-stop.ts:150,160,196-198` / `amadeus-log.ts:180`)を消費側棚卸しとしてテストで固定する

### FR-3: engine 未経由質問の観測可能化(Must)

- FR-3a: 全質問の通過点 `amadeus-log.ts:180-187`(`QUESTION_ANSWERED` 発行点)に「decide-question 経由か否か」を示す属性を追加する(自動裁定は `decisionId` 参照、人間直接回答は無印など判別可能な形)。**受け入れ基準**: decide-question 経由の回答と人間直接回答の両方を発生させ、audit 行の属性で2経路が機械判別できることを integration テストで assert
- FR-3b: semi/full 有効下で decide-question 未経由の質問回答が記録された場合に検出可能であること(イベント属性で after-the-fact 集計可能、または sensor)。受け入れ基準: 本 intent 内で実測済みの違反パターン(intent-capture の §13 直接提示)を再現する fixture が検出されること(落ちる実証)
- FR-3c: 実装は観測のみとし、回答の拒否(fail-closed 化)はしない — 仕様裁定 2026-08-07(はしご仕様は現状維持)

### FR-4: 回帰計測(Must)

- FR-4a: 測定述語は `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(`amadeus-intent-autonomy-replay.ts:24` が正準定数)を用いる。`AUTONOMY_MODE_SET` は legacy(発行点ゼロ — `amadeus-bolt.ts:7` 逐語、finding 7)であり新規計測に使わない
- FR-4b: ベースラインは第三者再現可能な C1(508/178/686、13 intents)・C3(tx/question.answered/human.turn の3 intent 対照)とする。C2(231件/63 intents)はクロスレビュー2名が再現不能と判定済みのため使わない
- FR-4c: 計測レポートは計測 ref(clone/SHA/述語/測定時刻)を明記する(cid:reverse-engineering:measurement-ref-in-artifacts)。適用後の新規 intent で「mode 設定前 human.turn = 0」を確認する(完了条件1 の受け入れ)

### FR-5: 導線の全面追記+パリティ回帰テスト(Must)

- FR-5a: 対象8面 — `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` + `packages/framework/harness/{cursor,opencode}/commands/amadeus.md` — へ `--autonomy` 起動宣言の導線を追記する(finding 8: 現状全面0件)
- FR-5b: `amadeus-utility.ts` の help text、`README.md`、`docs/reference/24-intent-autonomy.md`/`.ja.md`(日英対訳同時)へ `--autonomy` を追記する
- FR-5c: `stage-protocol.md` に semi の decide-question 操作手順を新設する(:131 の契約宣言に対応する操作段落 — 現状 :135 は「For a question under `full`」限定、finding 9)。あわせて claude SKILL.md:248「AUTONOMY IS NEVER INFERRED」を「エンジンに記録された mode による自動裁定は推論ではない」旨と整合するよう改訂
- FR-5d: 導線パリティ回帰テスト — 上記の全面(8面+help+README+docs 対訳)に `--autonomy` の記載が存在することを機械検査する blocking テストを新設する(落ちる実証: いずれか1面から記載を除去して赤を実測)
- FR-5e: 順序制約(RE 仮説 H1 の採用): FR-5 は FR-1 と同一 intent 内で着地する — 導線だけ先行すると「書いてあるのに birth 時に動かない」導線を作る。Bolt 順序は delivery-planning で dependency-first(D2)に従い確定

### FR-6: plugin stage 文書の drift 是正(Should)

- FR-6a: `plugins/formal-model-check/stages/formal-model-check.md:27` と `plugins/pr-convergence/stages/pr-convergence.md:27` の「Amadeus never runs it automatically」を実挙動へ整合させる — autonomy `none` では人間が起動判断、`semi`/`full` では advisory が `question` occurrence として梯子に掛かり `run-now` 選択で無人起動しうる(`amadeus-advisory-choice.ts:521,:576-586` — #2318 実装済み、finding 10)。**受け入れ基準**: 両ファイルから「never runs it automatically」の grep が 0 件になり、代替文言が none/semi/full の3分岐を明記していることを文言 grep で確認(是正後の全検証コマンド green 維持)
- FR-6b: 新 occurrence kind の追加はしない(完了条件6 の縮小 — クロスレビュー訂正+RE finding 10 で確定)

## Non-functional requirements

- NFR-1(安全性): すべての変更で fail-closed 原則を維持する。FR-2a の可視化は認可判定を変えない(観測のみ)。FR-1b は grant 儀式を一切緩めない
- NFR-2(互換): 後方互換レイヤー・移行シム・二重実装を追加しない(org.md Forbidden)。`AUTONOMY_MODE_SET` の legacy 読み取り(replay/doctor)は現状維持し、新規発行は導入しない
- NFR-3(テスト規律): TDD 既定(team.md tdd-default-with-narrow-exceptions)。新設ガード(FR-5d パリティテスト、FR-3b 検出)は落ちる実証必須。coverage/patch/complexity/drift の blocking gate 全維持
- NFR-4(監査): audit は append-only。新設イベントは `amadeus-audit.ts` 登録+`otel/event-registry.ts` mapping+`docs` の audit-format 面まで同一変更で同期(count-free 原則)
- NFR-5(配布): 正本は `packages/framework/core|harness` 側。`bun run build` 再生成で全ハーネス(manifest 検出集合)へ投影し、隔離2回ビルド再現性・source-only 境界・グラフ不変量検査を通す

## Constraints

- FR-GRT-006(full grant の確認儀式)は不変 — #2253 既決
- `SEMI_ROUTINE_INTERACTIONS` の集合(phase-gate / walking-skeleton 除外)は不変 — #2253 の設計意図
- 質問解決はしご仕様(FR-DEC-007、unreviewed 非同期レビュー)は不変 — ユーザー裁定 2026-08-07
- t450×2 のピン改訂は FR-1c の明示改訂として行い、他のピン(provenance 要求 t450-branch:119 等)は維持。改訂前後の赤/緑と対角実測(改訂後×修正前実装)の記録は **FR-1 を実装する Bolt の builder が code-summary に記録し、§12a reviewer が検証する**(Review iteration 1 NIT 2 是正 — 実施責任の明記)

## Assumptions

- 差分区間で patch surface が無改変(finding 11)のため、RE の file:line 引用は実装時点でも有効と仮定する。base 前進時は cid:code-generation:base-advance-regrounding に従い再接地する
- 本 intent 実行中のライブ実測4件(birth 拒否 / state 非対称 / イベント形 / 検収ラッチ)は再現条件が確定しており、修正の閉包検証の再現手順として使える

## Out of scope

- 検収バッチ化(1 human turn = 1 review ラッチの緩和、`amadeus-autonomy-review-production.ts:369-376`)— Q2 裁定により別 Issue へ起票(#1647 と同族)
- #1241 / #1647 / #1566 の本体
- grant scope 設計の変更(full=ALL_INTERACTIONS / semi=SEMI_ROUTINE は現状維持)

## Open questions

- FR-2a の新設イベント名は audit-format の命名規約に従い application-design で確定する
- FR-3a の属性設計(decisionId 参照形)は functional-design で確定する
- 検収バッチの別 Issue 起票文面(実測: 3件キューの2件目で PROVENANCE_REQUIRED、機序 = `latestTurnIndex <= consumedTurnIndex`)— intent 完了時の issue sweep で起票

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T12:14:15Z
- **Iteration:** 1
- **Scope decision:** none

必須7節完備・FR1-6がSuccess Metrics/scope境界へ1:1トレース・無申告逸脱なし。FOLLOW-UP 2件(codekb 3ファイルの装飾引用/FR-2a・2bの独立AC欠如)とNIT 2件は是正推奨だが着手可能な具体性あり

### Findings

- FOLLOW-UP | requirements.md:3 — 上流入力ヘッダーの business-overview/architecture/code-structure が装飾引用(3ファイルに本intentの節が未合成、grep 0件)。実質根拠は re-scans 正本 — 引用先の是正が必要
- FOLLOW-UP | requirements.md FR-2a/FR-2b/FR-3a/FR-6a — Must FRの一部に独立した受け入れ基準が欠落(FR-2c の3点実測に依存)。FR-2a/2b は pass/fail 手順の明記が必要
- NIT | requirements.md:3 — 宣言 consumes の team-practices への言及なし(N/A 根拠未記載)
- NIT | requirements-analysis-questions.md:9-13 — t450×2 改訂の赤/緑記録の実施責任(誰が・どの段)が未指定

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T12:16:28Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の4指摘すべてクローズ確認(装飾引用の是正/FR-2a・2b・3a・6aの独立AC/team-practices N/A/t450赤緑記録の責任者)。新規指摘なし・新規逸脱なし

### Findings

- None
