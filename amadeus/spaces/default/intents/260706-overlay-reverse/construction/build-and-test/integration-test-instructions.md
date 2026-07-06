# Integration Test Instructions

Unit: overlay-reverse（bugfix scope、Test Strategy: Minimal）

## 適用判断

統合検証の本体は installer eval の「FR579 実 source 相手の E2E + FR-3 統合」8 assertion である。この repo 自身（#554 overlay 適用済み = agent md に fable が焼き込まれた実状態）を source に、隔離した temp workspace へ実 CLI を走らせて配布物を検査する。

## 対象と観測点

| 観測 | 期待 | eval |
|---|---|---|
| 配布された architect / design agent md | `modelOverride: opus`（fable でない） | FR579-2.1 |
| 非 overlay agent（developer） | source とバイト同一 | FR579-2.2 |
| manifest の該当 hash | 書き込み後（逆変換後）内容の sha256 | FR579-3.1 |
| 2 回目 install での該当 agent md | 退避なし（通常上書き / skip 象限） | FR579-3.2 |
| `.amadeus-install-backup/` 配下 | 該当 agent md の退避コピーなし | FR579-3.2 |

## pre-#579 導入からの更新（机上 + reviewer 再現）

manifest 記録 = fable hash、現状ファイル = fable（未カスタマイズ）、新配布 = opus のとき、recorded == current の通常上書き象限に落ち、退避なしで静かに opus へ収束する（#543 判定表どおり）。

## 実行

`bun dev-scripts/evals/installer/check.ts`（`npm run test:all` にも含まれる）。既存 353 assertion の全 GREEN 維持で回帰も担保する。
