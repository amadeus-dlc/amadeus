# Build & Test Results — 260717-state-mirror-fixes

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(両 unit — fix-1170-retreat-guard / fix-1172-skip-denominator)

## 実測結果(測定 ref: 各 bolt ブランチの origin/main rebase 後 head、2026-07-18T01:44:40Z)

### U1 fix-1170-retreat-guard(PR #1197)

| 検査 | 結果 | 出典 |
|---|---|---|
| typecheck / dist:check / promote:self:check | exit 0 / 0 / 0 | conductor 再実行(rebase 後) |
| t233 integration | 11 pass / 0 fail | 同上 |
| t147+t149+t209(E-SMF-CG1 retarget) | 51 pass / 0 fail | 同上 |
| フルスイート `run-tests.sh --ci` | **RESULT: PASS**(381 files 級・Failed 0、CI-exit 0) | conductor 実行(rebase 後、本ステージ) |
| 落ちる実証 | builder+reviewer+e4 の3系統で独立実証(述語恒偽化→赤→revert→green) | code-summary.md / PR レビュー |

### U2 fix-1172-skip-denominator(PR #1198)

| 検査 | 結果 | 出典 |
|---|---|---|
| typecheck | exit 0 | conductor 再実行(rebase 後) |
| t232 unit | 12 pass / 0 fail | 同上 |
| t232 integration / lint / --ci | 19 pass / 0 / PASS(374 files) | builder 実測(rebase 前)+e3/e4 レビューで独立再実行 |
| 起票時再現の閉包 | pre-fix 18/32(reviewer)・17/32(e3、修復前 live)→ post-fix 18/18(fixture)・**live 18/18(C4 修復後、conductor 実測)** | fix-review-replays-origin-repro |

## PR レビュー成立

#1197: e3 READY(GoA 1)+e4 READY(GoA 1)/ #1198: e3 READY(GoA 1)+e4 READY(GoA 1)— いずれも独立実測付き(dist 11本ハッシュ同一・corpus sweep 717/717・落ちる実証の独立再実施等)。GitHub CI は record 時点で pending → マージ前に leader が green を実測確認(leader-executes-merge フロー)。
