# Requirements Analysis — 質問(260802-scope-grid-face-sync)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

> E-OC1 判定: 本 intent はソロモード。以下2問は真に未決の判断(RE の Open questions 由来)のみで、既決事項(止血対象4セル+prose 3ファイル、formal-model-check 除外、センサー値比較拡張の実施自体)は intent 記述・クロスレビュー裁定・RE 成果物で確定済みのため質問しない。回答はユーザー裁定の受領後に記入する。
>
> 各問の導出元: Q1 は code-structure.md(患部配置表 — installer-distribution の面在不在)と architecture.md(センサーの self-* 接頭辞フィルタ機序)から、Q2 は architecture.md(ガード3層の盲点機序と manifest の advisory 前提文言)から。intent 背景は business-overview.md の現在節(#2033 修正 intent)。

## Q1: installer-distribution scope の3面不在の扱い

`installer-distribution` scope は `.claude`/`.kimi-code` にのみ存在し、`.codex`/`.cursor`/`.opencode` に不在(RE 実測)。self-* 接頭辞でないため現行センサーの対象外。#2033 の被害クラス(値乖離)とは別種(存在の非対称)で、workspace-local scope の正本裁定が未決。

- A) 本 intent ではスコープ外とし、別 Issue として起票のみ行う(存在の非対称は値乖離と機序が別で、正本設計の裁定が必要)
- B) parity テスト(t413)の検出対象に「self-* の存在の非対称」まで含める(installer-distribution 自体は対象外のまま)
- C) 3面へ複製して対称化まで本 intent でやる
- X) その他

[Answer]: X — 「当初のスコープを縮めるのはNG」(ユーザー原文)。解釈: 当初 intent スコープ(止血4セル+prose 3ファイル+センサー値比較拡張)を一切縮小しない。installer-distribution の対称化は当初スコープ外のため本 intent では扱わず別 Issue 起票とし(A 相当)、t413 には self-* 4 scope の5面存在検査を含める(B 相当 — 既に WIP 実装済みの検査面)。Q2=A の選択(センサー拡張維持)と整合。ユーザー承認: 2026-08-02T10:39:32Z(AskUserQuestion 回答)

## Q2: 再発防止の enforcement point

現状: センサーは advisory かつ code-generation ステージ編集時のみ発火。CI に sensor 実行ステップなし。止血と同時に t413 parity テスト(CI blocking の統合テスト)が入る前提で、センサー側の扱いを決めたい。

- A) t413 を CI blocking の常設ガードとし、センサーは値比較へ拡張しつつ advisory のまま(write-time の早期検知役。manifest の「blocking は drift guards」文言を「blocking は t413」へ是正)
- B) A に加えてセンサーの default_severity を blocking へ昇格する
- C) センサー拡張はやめ、t413 テストのみにする(intent 記述からのスコープ縮小)
- X) その他

[Answer]: A — t413 を CI blocking の常設ガード、センサーは値比較へ拡張しつつ advisory 維持、manifest 文言是正。ユーザー承認: 2026-08-02T10:39:32Z(AskUserQuestion 回答)
