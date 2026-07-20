# Build & Test Summary — 260720-ballot-received-at

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 総括

Issue #1262 修正(bolt `433391d2c`、PR #1277)は**全て green**(build-test-results.md)。回帰テストは E-BFARA1 実データの verbatim 転写(申告非単調・受理単調 → verify pass)・移行窓(legacy at 軸)・受理軸 classifyLate・遅延可視化を固定し、落ちる実証(赤→緑)と閉包(CLI ハンドラ完走 exit 0+e4 の live e2e)まで実測済み。E-BRARA1〜3 の留保3件は全て実装で充足(null-fallback は生存判定 — 留保起案者 e4 が独立検分で妥当と確認)。

## Testing Posture 適合(bugfix)

- 対象リグレッションテスト追加: ✅(新規4+宣言更新)
- 既存スイート green 維持: ✅(--ci PASS、#1273 のテスト群含む)
- 既存 CI ゲート green: ✅(ローカル全 green、PR CI は leader 監視)
- performance/security 比例選定: N/A 根拠付き+受理時刻導入による攻撃面縮小を評価

## 残待ち

PR #1277 の main マージ(ユーザー承認 → leader 執行)。followup 候補: e4 提案の同一秒境界ピンテスト(非ブロッキング)。
