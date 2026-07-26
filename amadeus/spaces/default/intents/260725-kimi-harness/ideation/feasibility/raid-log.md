上流入力(consumes 全数): intent-statement

# RAID Log — 260725-kimi-harness

## Risks

| ID | リスク | 確度 | 影響 | 緩和策 | 状態 |
|---|---|---|---|---|---|
| R1 | hook payload のフィールド形状が docs と実機で乖離している | 中 | adapter の作り直し、契約テストの失敗 | live capture 駆動で adapter を作成(Q1 許可済み)。docs はベース形のみの記載と割り切り、実機優先 | Open |
| R2 | Kimi の仕様変更で hook 契約・検出パスが変わる(fast-moving: 0.19→0.29 が約1ヶ月) | 中 | 配線の死亡、skills/agents 未検出 | fail-open adapter(未知フィールド寛容)、doctor の機能 probe、実測バージョンフロアで「未検証」を明示(TC-4/TC-7) | Open |
| R3 | managed block マージが既存 `[[hooks]]`(14件)やユーザー記述を破壊する | 低 | ユーザー環境の破壊(外部境界) | マーカーコメント囲み・冪等・事前バックアップ・dry-run 表示・除去手順(OC-1) | Open(緩和策は設計に組込み済み) |
| R4 | 旧 `.kimi` 時代の docs(ja ヘルプページ等)を参照して誤ったパスを実装する | 低 | ハーネス未検出で全機能が死ぬ | 本ステージで3系統実測済み(`.kimi-code` 確定)。en docs を唯一の正典とする | Closed(2026-07-25 実測で解消) |

## Assumptions

| ID | 前提 | 検証状況 |
|---|---|---|
| A1 | `.kimi-code/skills/`・`.kimi-code/agents/` が自動検出される | docs + バイナリ文字列で確認済み。skills はこのセッションで実機実証、agents は未実機(dogfood で確認) |
| A2 | AskUserQuestion の PostToolUse payload が Claude 互換(presence mint に使える) | docs のイベント表からの推定。live capture で確認予定 |
| A3 | `kimi -p` 非対話モードが live journey の駆動に使える | docs 確認済み(0.24.2 で挙動統一)。driver 作成時に実機確認 |

## Issues

| ID | 課題 | 対処 | 状態 |
|---|---|---|---|
| I1 | プランの列挙更新ポイント行番号(packages/setup、scripts/plugin-projection.ts 等)は subagent 報告のまま未実測 | reverse-engineering ステージで実スキャンして確定(installer/distribution 系の重点スキャン規則に従う) | Open |

## Dependencies

| ID | 依存 | 状態 |
|---|---|---|
| D1 | kimi バイナリ 0.28.1+(実測下限) | 充足(0.28.1 導入済み) |
| D2 | bun on PATH(非対話シェル含む) | 充足(本セッションで使用中) |
| D3 | `docs/harness-engineering/09-porting-to-a-new-harness.md` の手順と packager の manifest 自動検出 | 充足(既存資産・実測済み) |
| D4 | ユーザーの実 `~/.kimi-code/config.toml` への配線許可(開発中) | 充足(Q1=A) |
