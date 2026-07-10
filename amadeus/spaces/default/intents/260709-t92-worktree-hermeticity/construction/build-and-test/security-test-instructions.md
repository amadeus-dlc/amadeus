# Security Test Instructions — t92-worktree-hermeticity

## セキュリティ関連の検証(devsecops 視点)

- 本修正はテスト実行前提の検査のみで、認証情報・シークレット・入力サニタイズ・本番コードの変更なし
- 検出力面の残余リスク検証: skip が CI で発火しないこと(ci.yml の bun install 前提)をアーキレビューで確認済み — #657 リグレッション検出器(exit-2 厳密ピン)は install 済み環境で無退行
