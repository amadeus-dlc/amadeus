# Intent Statement — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): なし(本ステージの consumes 宣言は空 — 入力は leader ディスパッチ 2026-07-16T20:59:49Z(ユーザー指示・agmsg 出典)と GitHub Issue #922 本文・クロスレビューコメント)。

## 問題(What / Why)

質問ファイル(`<stage>-questions.md`)の `[Answer]` タグが**選挙裁定の受領前に記入される**「先取り記入」ヒヤリハットが、規範(cid:requirements-analysis:election-answer-after-ruling、2026-07-10 persist)の存在後も**手順遵守だけでは再発**している(Issue #922 起票時 4例、うち2例はコミット前自己検知 — 検知が人間的注意力に依存)。

先取り記入は「未実施選挙の結果の捏造」= P2(実測事実のみを根拠にする)違反の入口であり、成果物への汚染が起きると下流ステージが偽の裁定を既決として消費する。

## 機会(検知の機械化)

intent 260716-eoc1-gate-check(#1101、PR #1106 マージ済み)が共有述語 `checkQuestionsEvidence()` を `amadeus-lib.ts` に実装・export 済み:

- 記入済み `[Answer]` ⇒ Answer 行内の E-code 裁定参照 or parse 可能な leader 承認 ISO タイムスタンプ、の含意形
- 空欄/N.A./裁定待ちプレースホルダ(単一括弧グループ)/`[Answer]` タグ不在(0問様式)= pass
- enforcement cutoff: intent dir 日付 ≥ 260716(旧様式 corpus 111 件の遡及ブロックを回避 — sweep 実測済み)

現在の発火点は `amadeus-state.ts gate-start` のみ(ゲート時 fail-closed)。**本 intent は同じ述語の発火点を追加**し、gate-start より早い時点(成果物保存時/センサー発火時)で先取り記入を loud に検知する。#1101 クローズコメントに「#922 は sensor 発火点の追加のみで実装可能な状態」と記録済み。

## スコープ境界

- IN: `checkQuestionsEvidence` の sensor 化(`.claude/sensors/` manifest + 発火配線)および/または lint 化。(a) sensor / (b) lint の併用可否は application-design で判断(ディスパッチで pre-approved の設計判断)
- IN: 落ちる実証 — 裁定参照なし記入 fixture で赤くなること+正当な既存データ(corpus 全数 sweep — cid:corpus-sweep-for-new-guards)で赤くならないこと、の両側実測
- OUT: 述語自体の意味論変更(#1101 で確定済み)。gate-start 発火点の変更(実装済み・稼働中)
- OUT: 質問ファイル様式そのものの変更

## 成功基準(測定可能)

1. 裁定参照なしの `[Answer]` 記入を含む questions ファイルが、gate-start を待たず sensor/lint 発火時点で FAILED として可視化される(fixture 注入で赤の実証)
2. 既存 corpus(cutoff 前様式含む)全数 sweep で false-red 0 件
3. `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` green、dist:check / promote:self:check 同期
