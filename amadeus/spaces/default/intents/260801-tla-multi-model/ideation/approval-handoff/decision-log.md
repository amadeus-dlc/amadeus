# Decision Log — 260801-tla-multi-model(ideation 確定分)

上流入力(consumes 全数): `initiative-brief.md`、ideation 各 questions ファイル

| # | 裁定 | 選択 | 根拠・場所 |
|---|---|---|---|
| D1 | バッチ境界 | `TLA_NAMED_INVARIANTS` unpin を包含(Q1=A) | IC Q1。#1920 AC「両モデルで落ちる実証」の充足条件(reviewer-2 指摘) |
| D2 | #1921 方式 | 明示宣言+推移解決の併用(Q2=C) | IC Q2。宣言漏れの無音化再発を構造的に塞ぐ |
| D3 | 成功定義 | 3点(Q3=A) | IC Q3。CI green・Core 編集の赤検出・FormalElection 不変 |
| D4 | CI 時間方針 | まず実測、超過時のみ time-box 後続裁定(FE Q1=A) | FE Q1。完全探索原則と CI 現実の折衷 |
| D5 | スキーマ移行 | v2 optional フィールド追加(FE Q2=A) | FE Q2。既存4資産の identity 値不変・最小侵入 |
| D6 | loader 既定 | 全登録モデル逐次・引数で絞り込み可(SD Q1=A) | SD Q1。新モデル登録忘れを構造的に排除 |
| D7 | ゲート運用 | 常任グラント 3364aa0b(stage-gates+phase-boundary、12h) | ユーザー「常任グラントON」+ TTL 確認 |
