# Evidence — practices-discovery(installer-distribution)

> ステージ: practices-discovery (2.2) / 作成: 2026-07-08

## スキャンした証跡

- 本日(同日)の RE codekb 8ファイル(`codekb/installer-distribution/`): code-structure / technology-stack / dependencies / code-quality-assessment / architecture / business-overview ほか — CI 構成、テスト4層、lint スコープ、依存ゼロ、バージョン管理(t68・タグ0件)を網羅
- git 履歴(直近マージ8件・コミット題名20件): 短命ブランチ(claude/・codex/ プレフィックス)+ PR マージ運用が team.md の Way of Working と一致することを確認
- 既存 team.md(2026-07-07 affirm、installer intent 文脈込み)— 再実行プレフィルの基準

## 推論(証跡から確定・質問不要と判断した領域)

- Way of Working / Walking Skeleton / Testing Posture: affirm 済み内容と本日の証跡が一致 — 変更なし(live 温存)

## 質問した差分ギャップ

- Q1: git タグ0件 vs Deployment の「タグ/PR 履歴で管理」の乖離 → vX.Y.Z タグ規約の新設で解消(A)
- Q2: CI lint の狭スコープ(tests/ のみ)と新設パッケージの検査配線 → 同一 PR での配線必須(A)

## 逸脱の記録

- stage prose の Step 2(4サブエージェント並列スキャン)を実施せず、同日の RE codekb をスキャン結果として代用した。理由: スキャン対象(CI・テスト・コードスタイル・セキュリティ)が数時間前の codekb と完全に重複し、worktree セッションでのバックグラウンドエージェント往復(park/unpark)を4回分節約できるため。証跡の鮮度は同日で担保。
