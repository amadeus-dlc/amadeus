# Code Summary — bolt-start-preaudit (#676)

## 実装

`amadeus-bolt.ts` start の非 worktree 経路にも `readStateFile(pd, flags.intent, flags.space)` を BOLT_STARTED emit 前の pre-audit ガードとして必須化(AC-676-1〜3、選挙 Q3=A)。worktree 経路の failJson 契約は不変、非 worktree は error() で拒否。t33 の既存 positive fixture は state seed 済みへ是正(バグを固定していたテストの更新)。

## 変更ファイル

- `packages/framework/core/tools/amadeus-bolt.ts`(本体)
- dist 4ツリー+self-install 同期(同一コミット)
- `tests/unit/t33.test.ts`(negative test+明示 selector positive+fixture seed 是正 — AC-676-4)

## 検証(実測 exit code)

| 項目 | 結果 |
|---|---|
| t33(修正前、パッチ退避+dist 再生成で実測) | exit 1(negative test のみ失敗 — 落ちる実証) |
| t33(修正後) | exit 0(26 pass) |
| typecheck / lint / dist:check / promote:self:check | すべて 0 |
| tests/run-tests.sh --ci | t92 test 44 の1件のみ失敗 — origin/main を別 worktree に checkout して同一失敗を再現済みの既存赤(本修正と無関係)。※main には #657 修正(PR #679)が入っており t92 が依然赤い点は要追跡 |

## PR

https://github.com/amadeus-dlc/amadeus/pull/695(Fixes #676)。AC-676-1〜4 充足。
