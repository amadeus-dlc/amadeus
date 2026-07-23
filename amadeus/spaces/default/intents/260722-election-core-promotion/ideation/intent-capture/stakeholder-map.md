# Stakeholder Map — チーム機能のコア昇格

> 上流入力(consumes 全数): なし(本ステージは consumes 宣言なし。入力はユーザーの intent 記述と 2026-07-23 グリル裁定 — intent-capture-questions.md)

## Key Stakeholders(主要ステークホルダーと関心)

| ステークホルダー | 立場 | 関心・期待 |
|---|---|---|
| プロジェクトオーナー(ユーザー) | 意思決定者 | チーム機能を amadeus の公式機能として配布したい。自己開発(self-hosting)が混乱しない構造の維持 |
| 外部利用者(amadeus 導入者) | 主顧客 | docs だけを頼りにチームモードを試せること。ドッグフード環境固有の暗黙前提が混入していないこと |
| ドッグフードチーム(leader + e1〜e6) | 副顧客・運用当事者 | 公式配布物経由の運用へ移行し `scripts/` 直依存から卒業。既存のチームモード運用(選挙・ack・ノルム)が壊れないこと |
| 外部ツール保守者(herdr / agmsg) | 依存先 | amadeus が両ツールをどう扱うか(依存宣言 / 抽象化 / 取り込み)は設計段の判断がそのまま統合面の契約になる |
| ハーネス利用者(claude / codex / cursor / kiro / kiro-ide / opencode) | 配布面の消費者 | `core/tools/` 配置は全6ハーネスの dist へ構造投影される(cid:code-generation:harness-tools-placement)。ハーネスごとのチーム機能可用性の明示 |

## Decision-Makers vs. Influencers(意思決定者と影響者)

- **意思決定者**: プロジェクトオーナー — スコープ(Q3=チーム機能一式)・成功定義(Q4=クリーン環境 E2E)・配布形態の最終承認、PR マージ承認(no-AI-merge)
- **影響者**: leader(ノルム整合の指摘・ゲート執行)、ドッグフードチーム(クロスレビュー・運用実測のフィードバック)、既存ノルム体系(org/team/project の既決 — 特に Bun-only 配布制約と core/harness 境界)
- **本 intent の実行体制**: e6 が conductor(ユーザー直接指示)。判断事項は選挙にかけずユーザー直接回答で確定(2026-07-23 ユーザー宣言)

## Communication Requirements(コミュニケーション要件)

- ユーザーへの確認: 各ステージの承認ゲートと未決判断はすべて本セッションの対話で直接諮る(選挙不実施)
- leader への報告: intent の節目(ステージゲート・PR 発行・完了)ごとに agmsg で自発報告(push-reporting)。ノルム更新の ack 対応は継続
- ミラー Issue: intent-first 運用に従い、park または phase 節目でミラー Issue(タイトル+概要+record リンク+状態行)を起票し、設計詳細は record 側に置く
- 外部ツール(herdr / agmsg)保守者への連絡: 設計段で依存の扱いが確定した時点で、必要になれば連携方針を別途判断(本ステージでは未確定のため約束しない)
