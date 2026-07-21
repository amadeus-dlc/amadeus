# Build & Test Summary — 260719-tally-choice-ruling

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 総括

Issue #1261 修正(bolt `da7834f`、PR #1268)のビルド相当(typecheck/lint+dist 非対象実証)とテストは**全て green**(build-test-results.md)。バグ修正の第一級成果物である回帰テストは、E-GMEBT 実データの verbatim 回帰(winner=choice2)・棄権除外・choice tie hold・unknown-choice 拒否を固定し、落ちる実証(6 fail→17 pass)と閉包(conductor in-process+e3 の実 ledger 両版対照)まで実測済み。

## Testing Posture 適合(bugfix)

- 対象リグレッションテスト追加: ✅(新規4+宣言更新6)
- 既存スイート green 維持: ✅(--ci 388 files Failed 0、GoA 成立判定・t236 裁定行期待は不変)
- 既存 CI ゲート green: ✅(ローカル全 green、PR CI は leader 監視)
- performance/security 比例選定: N/A 根拠付き+unknown-choice の受理境界強化を実測

## 残待ち

PR #1268 の main マージ(ユーザー承認 → leader 執行)。マージ後 #1261 は Fixes キーワードで自動クローズ(close-after-landing-verification は着地面 grep 後)。e2 の 260719-ballot-failclosed-amend が本 PR 着地後に再接地(直列合意)。
