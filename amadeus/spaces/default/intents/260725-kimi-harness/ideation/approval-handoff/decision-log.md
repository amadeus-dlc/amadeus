上流入力(consumes 全数): intent-statement, scope-document, intent-backlog, feasibility-assessment, constraint-register

# Decision Log — 260725-kimi-harness(IDEATION)

Ideation フェーズの全決定記録。全てソロモード・ユーザー本人の HUMAN_TURN 直接承認。

## Intent 起票(2026-07-25)

| # | 決定 | 内容 |
|---|---|---|
| D0 | スコープ | `amadeus-feature`(project.md § Scope Overrides の既定。ラベル `kimi-harness`) |

## Intent Capture(2026-07-25)

| # | 決定 | 内容 |
|---|---|---|
| D1 | 成功指標 = dogfood完結 | dist 生成・--check・決定的テスト green + promote-self + 実機 `/skill:amadeus` 起動・hook 発火・doctor パス(配布完結は不採用) |
| D2 | hook 配線 = インストーラ冪等マージ | managed block(マーカー囲み)をユーザー明示承認付きで `~/.kimi-code/config.toml` へ。doctor 検査 + 手動 fallback 併設 |
| D3 | レンダリング = claude 型 annex | (ユーザー指摘で質問撤回・設計事項へ)AskUserQuestion + PostToolUse mint。プローズ回答は fallback 許容 |
| D4 | live journey 作成 | kimi 用 driver(`kimi -p` 駆動)新規作成、`AMADEUS_KIMI_*_LIVE=1` ゲートで1本以上、ローカル実走後マージ |

## Feasibility(2026-07-25)

| # | 決定 | 内容 |
|---|---|---|
| D5 | 実機配線テスト許可 | 実 `~/.kimi-code/config.toml` への managed block 追加。バックアップ・マーカー・除去手順付き |
| D6 | クレジット許容 | probe + journey 実走(マージ前1回以上)まで |
| D7 | バージョンフロア = 実測版 | doctor 下限は実機検証バージョン(0.28.1)。未満は未検証として警告/失敗 |
| D8 | harnessDir 確定 | `.kimi-code`(en docs + バイナリ + 実機の3系統。`.kimi` は旧 kimi-cli 移行元) |

## Scope Definition(2026-07-25)

| # | 決定 | 内容 |
|---|---|---|
| D9 | swarm 有効化 | `HARNESS_VALUES` に kimi 追加。subagent フロア |
| D10 | セッションスキル全量同梱 | 6本。runner-gen デフォルト |
| D11 | スコープ境界 | Must M1-M10 / Won't W1-W6(scope-document)。順序 dependency-first + risk-first |

## 永続化した学習(§13)

| # | 学習 | persist 先 |
|---|---|---|
| L1 | hook 未配線環境での HUMAN_TURN 手動 replay 手順 | project.md ## Corrections(intent-capture:c5) |
| L2 | Kimi Code は en docs を正典とし ja ヘルプページを参照しない | project.md ## Corrections(feasibility:c6) |
