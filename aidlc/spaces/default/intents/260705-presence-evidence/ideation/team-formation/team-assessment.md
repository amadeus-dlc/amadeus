# Team Assessment（260705-presence-evidence）

上流入力: [scope-document.md](../scope-definition/scope-document.md)

## 体制

多体連携（team.md「多体連携の運用」節）の engineer2 が単独担当する。変更作業は engineer2 の worktree 1 個に閉じる。

## 役割

| 役割 | 担当 | 責務 |
|---|---|---|
| 契約級判断（候補採否）/ merge | Maintainer | requirements gate の個別確認（auto 例外）、PR merge |
| gate 承認の中継 | leader | auto 委任の内容確認と中継。採否 gate は個別確認へ切替 |
| 調査・実装・文書化 | engineer2 | 実測に基づく判断材料の整備、採否確定後の実装または文書化 |
| 接触面調整 | engineer1（#428）、engineer3（#504+#507） | amadeus-state.ts / tools の重なり確認（Construction 前のピア連絡） |

## キャパシティ所見

必要スキル（audit shard の解析、amadeus-state.ts / lib の読解、TDD eval）は #451 までの実績で充足。追加獲得は不要。
