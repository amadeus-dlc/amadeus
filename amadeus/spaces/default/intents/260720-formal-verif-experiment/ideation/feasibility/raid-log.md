# RAID Log — 260720-formal-verif-experiment

## 上流入力(consumes 全数): intent-statement.md

intent-statement.md の成功指標に対するリスク・前提・課題・依存を登録する。実測日: 2026-07-20(worktree HEAD)。

## Risks(リスク)

| ID | リスク | 影響 | 緩和 |
|---|---|---|---|
| R-1 | 共通モード故障: 同一 AI が両アームのスペックを書くと概念混同がスペックごと持ち込まれ、実験が両アーム偽陰性化 | 実験の判定力喪失 | アーム別 blind 独立起草を実験プロトコルに固定(C-5)。注入欠陥を知らないエージェントに書かせる |
| R-2 | TLA+ の学習曲線ではなく**検証の学習曲線**: AI が書いた TLA+ スペックの忠実性を検証する経路が未整備 | 偽グリーンのスペック | 落ちる実証(欠陥注入で赤くなること)を各アームの完成条件にする — 既存ノルム(falling-proof)の適用 |
| R-3 | 注入ブランチが e2/e4 の in-flight 作業と交差 | 並行作業の破壊 | C-7 の非交差実測。注入は read-only の過去コミット復元ブランチで行い main へマージしない |
| R-4 | 欠陥台帳の計数差(「6件」vs 実測5件)のまま実験設計が進む | 検出率の分母が揺れる | requirements-analysis で欠陥台帳を PR diff 起点で確定(A-2) |

## Assumptions(前提)

| ID | 前提 | 確信度 |
|---|---|---|
| A-1 | 修正 PR(#1268/#1277/#1273)の diff revert で欠陥状態を忠実に再現できる | 高(merged PR 実測、squash 単一コミット) |
| A-2 | 欠陥の正確な台帳(5件+計数差1)は requirements-analysis で確定できる | 高(PR diff と issue 本文が現存) |
| A-3 | 1日規模で両アームの最小実装+計測が完了する | 中(6体グリリングの一致見積りだが未実証) |
| A-4 | TLC の有界検査は選挙状態機械(7状態×指令6種+hold)のスケールで数秒〜数分に収まる | 高(状態空間が極小) |

## Issues(既知の課題)

| ID | 課題 | 状態 |
|---|---|---|
| I-1 | TLC/Apalache 未導入(`which` 実測で不在) | open — construction 時に tla2tools.jar 取得(C-1 の境界内) |
| I-2 | 「バグ6件」の6件目が issue 台帳で未特定 | open — requirements-analysis で確定(R-4) |

## Dependencies(依存)

| ID | 依存 | 方向 |
|---|---|---|
| D-1 | record PR のマージ(独立2名レビュー)→ construction 進入 | 本 intent がブロックされる側 |
| D-2 | ユーザーの construction 進行判断(park 解除) | 同上 |
| D-3 | e2/e4 の選挙 CLI 面 intent の着地状況(非交差確認の相手) | 相互 |
