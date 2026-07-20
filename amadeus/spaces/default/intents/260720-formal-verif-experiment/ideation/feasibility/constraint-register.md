# Constraint Register — 260720-formal-verif-experiment

## 上流入力(consumes 全数): intent-statement.md

intent-statement.md のスコープ裁定(Q1〜Q3)を制約として正規化する。

## 技術的制約

| ID | 制約 | 根拠 |
|---|---|---|
| C-1 | JVM ツール(TLC/Apalache)は repo ローカル CI/scripts 限定。配布フレームワーク(packages/framework/、dist/、self-install)へ持ち込まない | Q2 ユーザー裁定(2026-07-20T04:40:41Z)、gh-scripts-boundary の拡張、Bun-only Forbidden との整合 |
| C-2 | 実験アームは2本(TLA+/TLC、TS内完結)。Alloy は取りこぼしバグ類型が出た場合のみ第3アーム追加 | Q1 ユーザー裁定(同上) |
| C-3 | 勝者アームの成果物は本採用初版として育てる(throwaway 禁止)。品質ゲートは本採用 intent 側 | Q3 ユーザー裁定(同上) |
| C-4 | 採否基準: 全欠陥検出を必須条件とし、達成方式間で実装工数・CI実行時間・偽陰性/偽陽性のコスト最小を採用 | 6体グリリング収斂+leader 台帳登録(2026-07-20T04:35Z ack) |
| C-5 | 両アームの起草は blind 独立(同一エージェントが両方を書かない)— 共通モード故障の緩和 | 6体グリリング一致知見(実験プロトコル要件として design 段で固定) |

## 組織的制約

| ID | 制約 | 根拠 |
|---|---|---|
| C-6 | 本 intent は ideation 完了で park。construction 進入は record PR マージ+ユーザー判断が前提 | ユーザー指示+intent-first-mirror-issue ノルム |
| C-7 | construction 進入時、e2/e4 の選挙 CLI 面 in-flight intent との非交差をファイル単位で実測確認 | leader 前提条件(2026-07-20T04:35Z) |
| C-8 | park 時にミラー Issue を起票(タイトル+3〜5行概要+record リンク+状態行のみ。設計詳細は record 側) | intent-first-mirror-issue ノルム |

## 規制・コンプライアンス制約

該当なし — repo ローカル開発支援ツールの実験であり、外部データ・個人情報・規制対象領域に触れない(N/A 根拠: intent-statement.md のスコープ)。
