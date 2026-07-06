# 実現性評価（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[competitive-analysis.md](../market-research/competitive-analysis.md)、[market-trends.md](../market-research/market-trends.md)、[build-vs-buy.md](../market-research/build-vs-buy.md)

## 設計姿勢

本仕組みは**暫定機構**である（Maintainer 判断、2026-07-05）。
軽量に実装し、後日本格的な仕組みへ置き換える前提とする。
したがって、堅牢化（リトライ戦略の作り込み、通知系、統計）は行わず、「冪等な全上書き + drop 記録 + 次回回復」の最小構成に留める。

## 技術的実現性

| 構成要素 | 評価 | 根拠 |
|---|---|---|
| ローカルスキャン（`intents.json` + `aidlc-state.md`） | 実現可能 | 必要なフィールド（status、Active Agent、Worktree Path、stage 進捗 `[?]`）は既に存在する（intent-statement.md 参照）。ホストは audit shard 名から取れる |
| Projects v2 への冪等反映 | 実現可能 | `gh api graphql` の mutation batch で board / item / field を操作できる（competitive-analysis.md、build-vs-buy.md） |
| hook 起動（キュー書き込み + flush） | 実現可能 | 既存の hooks 基盤（PostToolUse / Stop / SessionEnd、hooks-health）と同型でよい。ネットワークは flush 側だけが触る |
| board 設置 | 実現可能 | org project（amadeus-dlc）を作成し amadeus repo にリンクする（feasibility-questions.md Q1）。作成には `gh auth refresh -s project` が前提 |

## 主要な確定事項（Q&A より）

1. board は org project とし、amadeus repo にリンクする。
2. 全 Intent を掲載し、completed は Done 列 + auto-archive で整理する。
3. `project` scope 不足は sync 側で明示検知して knock out し、drop を記録する（複数ホスト運用に耐える）。
4. flush 失敗は drop 記録 + 次回回復のみ。board の鮮度フィールドが遅延の可視化を兼ねる。
5. 実施順は ①台帳整備 → ②手動 sync → ③hook 結線。② の時点で board を人間が確認する。

## 実装先の制約

このリポジトリ内だけで起動する開発ツール（`dev-scripts/` とリポジトリローカル hook 設定）とする。
Amadeus 本体（`skills/amadeus*`、`.agents/amadeus/` エンジン、昇格先、parity 対象）には実装しない。
