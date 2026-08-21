# Intent Capture Questions — 260821-fmc-retirement

Intent: 260821-fmc-retirement / Depth: Standard(予算 最大8問、本ステージは4問で構成)
承認エビデンス: ユーザーが full autonomy grant を承認(実 HUMAN_TURN「full grantで」2026-08-21)し、set-autonomy --mode full が 2026-08-21T03:22:00Z にコミット(grant_id intent-grant-b79b828bb98fb4abcaaf2dd74c1a6a44、INTENT_AUTONOMY_TRANSACTION_COMMITTED)。Q1/Q2/Q4 はユーザー実 HUMAN_TURN 裁定と第一原理からの一意導出、Q3 は承認ゲート AskUserQuestion の実回答(2026-08-21T03:20:00Z 頃)。

既決事項は再質問しない(cid:requirements-analysis:c5)。Q1・Q2・Q4 はユーザーの実 HUMAN_TURN 裁定と第一原理からの一意導出で確定済みとして記録し、真に未決の Q3 のみ承認ゲートで確認する。

## Q1: 退役の範囲は?

- A) 完全退役 — プラグイン・設定・CI・テスト・ノルム・投影のすべてを削除し 0-plugin baseline へ
- B) 検証系(CI acceptance + TLC toolchain)は残し authoring 系のみ削除
- C) config 無効化のみ(コードは温存)
- D) 段階退役(まず無効化、後で削除)
- E) 現状維持
- X) その他

[Answer]: A — ユーザー裁定(2026-08-21 実 HUMAN_TURN、逐語「今のFMCはゴミです。ないほうが混乱がない。再設計するので、それまでは削除です」「関係するノルムやテストも削除ですね」)。B/C/D は「ないほうが混乱がない」に反する部分温存であり不採用。

## Q2: `amadeus/spaces/default/specs/tla/`(7 .tla + cfg + model-map.json)の処遇は?

- A) 削除 — 再設計時の参照は git 履歴で足りる
- B) 退役アーカイブディレクトリへ移動して保存
- C) specs/tla のみ温存(consumer なしで放置)
- X) その他

[Answer]: A — P5(古い挙動は削除して置き換える。バージョン管理下のため履歴が完全に保存し、再設計時は任意コミットから参照可能)と裁定「ないほうが混乱がない」からの一意導出。B は org.md Forbidden(要求されない移行シム・二重実装)の同族、C は consumer なきデータの混乱源。

## Q3: FMC 系 open Issue の処遇は?(#3246 = author-new 分離、ほか requirements 段で全数棚卸し)

- A) クローズ(理由コメント付き — 「FMC 退役(本 intent)により失効。再設計時に必要なら再起票」)
- B) open のまま残し、再設計用ラベル等で識別
- C) requirements 段の棚卸し結果を見てから個別裁定
- X) その他

[Answer]: A — ユーザー裁定(2026-08-21 承認ゲート AskUserQuestion 実回答「A) クローズ(推奨)」)。理由コメント付きでクローズし、再設計時に必要なら再起票する。対象の全数は requirements 段で棚卸しし、クローズ実行は着地検証後(cid:requirements-analysis:close-after-landing-verification に従い本 intent の削除着地後)。

## Q4: team.md「二層検証」ノルムの形式検証面の扱いは?

- A) 形式検証層の記述を削除(再設計で復活させる場合は改めてノルム化)— 単独ノルム PR で整理
- B) 「現在は無効(再設計待ち)」と注記して温存
- X) その他

[Answer]: A — 裁定「関係するノルムやテストも削除」の直接適用。ノルム変更は蒸留手順(origin/main 起点の単独ブランチ PR、矛盾監査)に従って実施する。
