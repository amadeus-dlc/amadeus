# Intent Statement — 260720-hold-choice-resolution

上流入力(consumes 全数): (本ステージは consumes 宣言なし — 入力はユーザー記述 $ARGUMENTS と Issue #1267)

## Problem Statement

E-TCRRA2 裁定(choice 同数 tie は hold へ倒す — 人間エスカレーション)と E-TCRCG 裁定(hold 裁定行は二値表現維持)の帰結として、多肢選挙の tie を人間が解決する場面で `HOLD_RESOLUTIONS`(scripts/amadeus-election.ts:69-71)の choice-blind 二値語彙(adopted/rejected)が「どの choice を勝者とするか」を表現できない(Issue #1267 = E-TCRCG e4 留保の履行)。

## Target Customer

hold 裁定を実施する人間(ユーザー・leader)。多肢 tie 裁定が CLI 語彙で直接表現でき、record.md へ勝者 choice が正確に永続化される。

## Success Metrics

1. choice tie 由来 hold への勝者 choice 指定 resolution(構文は design 裁定)が受理→永続化→record.md 裁定行描画まで貫通(human-ruling-persist-through、閉包テスト固定)。
2. E-TCRCG=A の既存二値経路の後方互換は設計時裁定に従う(t236:309-310 の既存ピンとの整合)。
3. 検証 green 維持(typecheck / lint / --ci)。

## Initiative Trigger

E-TCRCG(2026-07-19)の e4 留保が Issue #1267 として起票され、クロスレビュー成立のうえユーザー承認済み編成(4 intent 並列)でディスパッチされた(2026-07-20T02:47Z)。

## Initial Scope Signal

scope=amadeus(ディスパッチ要件(1))。修正面は scripts/amadeus-election*.ts 系+テスト。hold-resolution の choice 語彙拡張がユーザー可視契約変更に該当する場合は正準リスト(4)エスカレーションを RA で明示(要件(3))。e4 バッチ(#1254/#1255/#1257)との record.ts 関数単位非交差確認を着手前に実施(要件(4))。
