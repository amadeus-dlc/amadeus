# Scope Document — amadeus-mirror ツール

上流入力(consumes 全数): intent-statement.md(intent-capture)、feasibility-assessment.md、constraint-register.md(feasibility)

## In Scope(スコープ内)

- `scripts/amadeus-mirror.ts`(bun 直接実行、repo ローカル)の新規実装
- サブコマンド3つ:
  - **create**: アクティブ intent のミラー Issue を起票(タイトル=intent 名、本文=定型3要素、`intent-mirror` ラベル付与)し、Issue 番号を intent 側へ記録
  - **sync**: Issue 本文の状態セクションを決定的ソース(summary --json / intents.json / amadeus-state.md)から再生成して書き換え
  - **close**: intent 完了状態を機械検査し、通過時のみ `gh issue close`(不成立は exit 1)
- 定型3要素テンプレート(概要+record リンク+状態行)の実装内蔵 — 設計詳細を書く場所を構造的に持たせない(constraint C5)
- `intent-mirror` ラベルの新設(Q2 裁定)

## Out of Scope(スコープ外)

- フック/エンジン連動の自動 sync(Q1 裁定 — 効果を見て別 intent)
- framework 配布(dist/self-install 出荷、intent-capture Q1 裁定 — 安定後に別 intent)
- Issue → record の逆方向同期(ノルムで一方向と確定、恒久 out)
- 既存 Issue の一括ミラー化キャンペーン(キャンペーン禁止ノルム準拠 — 新規 intent から適用)
- bug Issue 経路(Issue-first)の変更 — 従来運用不変

## Minimum Viable Scope(最小成立範囲)

create + sync の2コマンドで運用は開始できる(close は intent 完了まで呼ばれない)。ただし close の機械検査は成功指標(3)の中核であり、本 intent の完了条件には3コマンドすべてを含める。

## Prioritization(優先順位、MoSCoW)

- Must: create / sync / close、定型3要素テンプレート、close 着地検査、intent-mirror ラベル
- Should: sync の冪等性(再実行安全)、未認証 gh の loud エラー
- Could: create 時の重複ガード(同一 intent の二重起票検知)
- Won't(この intent では): 自動発火、framework 出荷、逆方向同期
