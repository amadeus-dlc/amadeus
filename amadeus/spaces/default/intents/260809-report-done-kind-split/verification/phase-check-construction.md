# Phase Check — Construction(260809-report-done-kind-split)

## トレーサビリティ検証

- **code-generation**(3.5、unit `fix-2762-done-terminal`): 実装は再生成せず**着地面の実測検証へ置換**。本 unit の実装は PR #2767(squash `34888d840e538d0df8a504ed7cd26b9814a9b5c8`、merged 2026-08-10T01:00:03Z)で `main` へ着地済みで、`git merge-base --is-ancestor 34888d840 HEAD`(HEAD = `e7c0515fec217a589035e8ba0aef814599ad34a2`)が exit 0。RA 当初裁定の方式 A(`done` へ `terminal` 追加)は CG 段で方式 B(専用 kind `committed` の新設)へ改訂済みで、FR-1〜FR-7 はその読み替えで検証した(FR-7 は受け入れ基準自体が失効 — 満たしたとは記録していない)。§12a architecture-reviewer: i1 NOT-READY(BLOCKER 3件 = 逸脱節が未実行の override を配送機構として主張 / FR-7 を「不変」と宣言しつつ同節でその破れを報告 / FR-6 の赤側が未測定かつ未検証宣言なし)→ 是正 → i2 READY(BLOCKER 0、FOLLOW-UP 6・NIT 2)。§13 は梯子裁定(auto-decision-3eff7541813b9593fc2421a56880fefd)で 9 候補中 2 件採用。gate: semi 自動承認(Approval Provenance: intent-grant)
- **build-and-test**(3.6): 指示書 7 点(build / unit / integration / performance(N/A 判定)/ security(N/A 判定)/ summary / build-test-results)。Step 10 を実行し、`requirements.md` の NFR ブロッキング集合を全数測定。formal-model-check の advisory hold(`never-run`)は記録だけで解消せず、登録済み全 4 モデルの TLC 網羅探索を実行して解消した。gate: 人間承認
- **SKIP 済み**: functional-design / nfr-requirements / nfr-design / infrastructure-design / ci-pipeline / formal-model-check / tla-authoring / pr-convergence(self-fix 既定)。うち formal-model-check はステージとしては SKIP のまま、engine の `execute-advisory-handoff` 経由で実検査のみ実施

## 要件遡及

| FR(方式 B 読み替え後) | 実測 |
|---|---|
| FR-1 `committed` kind 新設 | `amadeus-directive.ts` に 5 行一致(union :54 / `CommittedDirective` :401 / `VALID_KINDS` :502 / `FIELD_CHECKS_BY_KIND` :743 / golden sample :1456)。`DoneDirective`・`DONE_FIELDS` は不変 |
| FR-2 / FR-3 emit サイト分離 | `done` 4 サイトは全て終端、`committed` 6 サイトは全て `report` 系ハンドラ(所有関数を列 0 の `function` 宣言から機械決定) |
| FR-4 Stop hook | `amadeus-stop.ts` に `committed` 分岐 0 hit。`runEngineNextKind()` は `next` の kind のみを読む |
| FR-5 conductor 契約 | 存在側 = 10 面すべてに `committed`。不在側 = 退役リテラル census で 7 ハーネス面 0/7・対照の現行形 7/7、pi 面は個別確認、docs 2 面も退役 3 リテラル 0 hit |
| FR-6 落ちる実証 | 緑側 = t528 7 pass / 0 fail、t115+t118 38 pass / 0 fail。赤側は #2767 本文の Red → Green(2 pass / 3 fail → 5 pass / 0 fail)を一次記録として引き、本セッションの未検証面として明記 |
| FR-7 スコープ外の不変 | 方式 B 改訂により受け入れ基準が失効。件数語 diff を named commit(`34888d840`)で提示 |

NFR ブロッキング集合: typecheck 0 / lint 0 / 再現性(隔離 2 回ビルド + `diff -r`)0(dist 5256 = 5256)/ source-only 0 / graph invariants 0 / `bun run build` 後の追跡 drift は record 配下のみ / test:ci exit 2(Failed files 2、いずれも環境起因で自変更由来 0)。形式検証: 登録済み全 4 モデルが NOT_DETECTED・`completion-marker.json` は 4 件とも `complete: true`、model-completeness センサー pass。

## 配送

- 本 unit の Bolt PR は #2770 だが収束せず #2767 に supersede された。#2770 には欠落していた Amadeus provenance を 2026-08-19 に真実として補記(実装・コミットは未接触)
- `pr-convergence override` は CLI 契約上実行不能と実測(`pr-convergence-git-runner.ts:255` が checkout ブランチ == PR head を要求、`pr-convergence-cli.ts:711` が既存の created epoch を要求、`--unlinked true` は self-* で禁止)。監督者裁定により、残存成果物である intent record を運ぶ Bolt PR **#3236** を発行して収束させる形を採った
- **#3236 の収束記録は「#3236 が収束したこと」を意味し、実装の配送を意味しない**。実装の配送先は #2767 / `34888d840`

## 未解決・引き継ぎ

- unreviewed 自動裁定 2 件(§13 学習選定 ×2)— `amadeus-bolt list-auto-decisions` で検収可能
- §12a FOLLOW-UP 残 4 件(`requirements.md` 本文が方式 A のまま / SKILL 面の件数語ドリフト残余 / `emitDeferredCompletionBoundary` の腕が読解依拠 / 配布 drift ガード 2 本の初回 exit 1 の帰属)— `build-and-test-summary.md` に集約
- 起票済み: **#3239**(supersede された unit に正直なクロージャ経路がない)/ **#3243**(active-intent カーソル下で `t-approve-batch-presence-guard` が決定的に落ちる)
- 検証時刻: 2026-08-19T08:40Z(conductor 実測)
