# Feasibility Assessment — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md

## 判定: GO

測定 ref: 再接地後 worktree HEAD 289d162ae(origin/main を --no-ff マージ、parents=2・ls-files -u 0 の完遂機械確認済み — 初回実測が stale tree だったため leader 照会を受け全引用を再実測)。

## 技術的実現可能性(実測 — 再接地後)

- **受理面**: hold-resolution の受理は `HOLD_RESOLUTIONS`(election.ts:69-73)の per-reason テーブル+`handleHoldResolved`(:201 で table 参照)— tie 行は `{ adopted: "tallied", rejected: "tallied" }` の二値。choice 指定の追加はテーブル拡張 or 構文パース追加のどちらでも既存 seam 内(構文は design 裁定)。
- **永続化面**: resolutions は tally.json の `resolutions` 配列へ保存され、record.md へ trail 行転記 — human-ruling-persist-through の既存経路が実在。
- **描画面(ギャップの実装点)**: `TallyResult` は #1268 により winner+choiceCounts を保持(model.ts:411-418)し、`rulingText`(record.ts:120-127)は established に対し勝者 choice label+票数内訳を描画**できる**。一方、人間 hold 裁定の経路は `handleRender` の **rulingOverride 文字列合成(election.ts:390-392)**が `finalRuling.resolution === "adopted" ? "採用" : "不採用"` の二値文字列を生成して `renderPersistDraft` の rulingOverride(record.ts:149/:159 `rulingOverride ?? rulingText(result)`)へ渡す — **ここが choice 勝者を表現できない当該ギャップの実装点**。合流先も同一点(choice 指定 resolution を受けたとき override 文字列を winner 形へ、または override を経ず winner 付き established を合成)。
## テスト面

t236 に hold-resolved の閉包テスト実在(M1 closure #1235 系)— choice 指定の閉包テストは同型で追加可能。

## 検証コマンド

既存4種(typecheck / lint / --ci / lcov)。配布面変更なし(scripts/ は dist 投影 0 — 前 intent RE 実測の継承)。
