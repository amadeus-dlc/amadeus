# Business Overview

> Reverse Engineering 成果物 — Intent: 260706-installer-impl / 分析対象: main @ 14c40c9c(現 HEAD e2c28731、2026-07-07 鮮度リフレッシュ)

## ビジネスドメイン

Amadeus は **AI-DLC(AI-Driven Development Life Cycle)フレームワーク**である。Claude Code / Codex / Kiro / Kiro IDE といった複数の AI コーディングハーネス上で動作する、構造化されたソフトウェア開発ライフサイクル(Ideation → Inception → Construction → Operation)のオーケストレーション基盤を提供する。

- **対象ユーザー**: AI エージェントを開発プロセスに組み込みたい開発チーム
- **提供価値**: 決定論的な状態管理・監査証跡・段階ゲート付きのワークフローを、LLM の非決定性の上に被せることで、再現性と説明責任のある AI 駆動開発を可能にする
- **配布モデル**: デプロイ基盤を持たない。ユーザーが `dist/<harness>/` を自プロジェクトへコピーする方式。配布物は外部依存ゼロ(bun ランタイムのみ前提)

## 目的とコア原則

1. **ハーネス中立**: 単一のソースオブトゥルース(`core/`)から4ハーネス向け配布物を機械生成し、バイト単位のドリフトガードでパリティを保証する
2. **決定論の分離**: 状態遷移・監査・グラフ解決などの決定論的処理は TypeScript CLI ツール(bun 実行)が担い、LLM は判断と生成に専念する
3. **人間の統制**: 承認ゲート、在席検証(HUMAN_TURN ゲート)、監査イベントのホワイトリストにより、人間の関与ポイントを構造的に強制する
4. **ドッグフーディング**: このリポジトリ自身が Amadeus を使って開発される(セルフインストール昇格 `promote:self`)

## 主要機能

| 機能 | 概要 |
|---|---|
| ワークフローオーケストレーション | 32 ステージ × 5 フェーズの状態機械。`/amadeus` 一つの入口から scope 検出・ステージ実行・ゲート処理 |
| 11 ドメインエージェント | product / architect / developer / quality 等のペルソナをコンダクターが採用またはサブエージェント委譲 |
| 適応コンポーザー | `/amadeus compose` — タスクに合わせた EXECUTE/SKIP ステージグリッドを提案し承認ゲートを通す |
| 監査ログ | 全遷移・決定・回答をイベント型ホワイトリスト付きで per-clone シャードに記録 |
| 5層ルールシステム | org → team → project → phase → stage の strict-additive 解決。§13 学習ゲートで矛盾を却下 |
| センサー | required-sections / upstream-coverage / linter / type-check の決定論的検証(advisory) |
| read-only セッションスキル | session-cost / replay / outcomes-pack — 状態を進めず監査も発行しない参照系 |
| 単一ステージランナー | 38 スキルとして各ステージを `--single` モードで隔離実行 |

## 現在の Intent との関係

Intent `260706-amadeus-grilling`(scope: grilling-integration)は完了した。対話モード契約(stage-protocol.md §3 の Guide me / Edit file / Chat)への **第4のモード(grilling: 高頻度連続質問による設計の炙り出し)** 追加は PR#601 でマージ済み、続く promote-self の composed-scope 保持修正は PR#602 でマージ済みである。両 PR とも OUTCOMES.md が発行済み。

現在の active intent は `260706-installer-impl`(scope: feature)— npm 配布インストーラ `@amadeus-dlc/setup` の実装。Ideation フェーズは完了し、Inception フェーズが進行中である。
