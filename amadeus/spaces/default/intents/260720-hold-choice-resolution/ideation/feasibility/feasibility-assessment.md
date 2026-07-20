# Feasibility Assessment — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md

## 判定: GO

測定 ref: worktree HEAD(origin/main 追随後、#1273/#1277 込み)。

## 技術的実現可能性(実測)

- **受理面**: hold-resolution の受理は `HOLD_RESOLUTIONS`(election.ts:68-73)の per-reason テーブル+`handleHoldResolved`(:165 → 実装本体)— tie 行は `{ adopted: "tallied", rejected: "tallied" }` の二値。choice 指定の追加はテーブル拡張 or 構文パース追加のどちらでも既存 seam 内(構文は design 裁定)。
- **永続化面**: resolutions は tally.json の `resolutions` 配列へ保存され(handleRender :376 で読取)、record.md へ trail 行として転記 — human-ruling-persist-through の既存経路が実在。
- **描画面**: `handleRender` の effective 合成(:378-385)が finalRuling を `outcome: adopted|rejected` の二値 TallyResult へ写像 → `rulingText`(record.ts:107-112)が「裁定: 採用/不採用」を描画。**ここが choice 勝者を表現できない当該ギャップの実装点**であり、合流先も同一点(合成時に winner 情報を運ぶ形へ拡張)。
- **未確定(RE で実測)**: TallyResult は現 main でも二値(model.ts:312-314、winner フィールドなし)— E-TCRCG「tally 結果のみ winner 描画」の実現経路(#1268 の choice 多数決が record へどう到達しているか)の全容は RE の diff-refresh で確定する。

## テスト面

t236 に hold-resolved の閉包テスト実在(M1 closure #1235 系)— choice 指定の閉包テストは同型で追加可能。

## 検証コマンド

既存4種(typecheck / lint / --ci / lcov)。配布面変更なし(scripts/ は dist 投影 0 — 前 intent RE 実測の継承)。
