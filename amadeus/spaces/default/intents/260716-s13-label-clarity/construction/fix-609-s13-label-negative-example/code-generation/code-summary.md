# Code Summary — fix-609-s13-label-negative-example

- PR: https://github.com/amadeus-dlc/amadeus/pull/1055(Refs #609)
- 逸脱: なし(builder 申告+conductor 検分)

## 変更(9ファイル)

正本 stage-protocol.md(否定例1文追記のみ・肯定形無改変)+ self-install 2 + dist 5(機械同期)+ t86(リグレッションピン assertion)。

## 落ちる実証(実測)

否定例の削除注入 → t86 の新 assertion のみ RED(7 pass/1 fail)→ 復元 → 8/8 GREEN(stash 不使用)。

## 検証(全 exit 0)

package.ts / promote:self / dist:check / promote:self:check / typecheck / lint / 専用5ファミリ(t86+t34-37、201 pass)/ smoke(RESULT: PASS)。AC-3a: `Persist c5 only` 8/8 ツリー一致(実列挙の機械再計算)。AC-3c: 落ちる実証の Mandated 適用外整理(prose 追記=検査機構非新設)は要件どおり — ただし新設 assertion 自体には削除注入の落ちる実証を実施済み。

## 備考

worktree の node_modules 未導入で typecheck 初回 127 → bun install --frozen-lockfile 後 0(lockfile ドリフトなし — 260715 intent と同型の環境事象、L-CG1 の実文帰属で確定)。

## base-advance 確認(reviewer Minor #1 への追記)

PR base(43dcab5db)から origin/main が前進(並行 intent の codekb 更新等を含む)。stage reviewer が実 3-way merge シミュレーション(`git merge --no-commit --no-ff`)で**衝突なし・並行 codekb 節の温存・否定例の正着地**を独立実測済み(READY 所見 Minor #1)。conductor 追認: GitHub mergeable = MERGEABLE を再実測。対 main 2-way diff に見える並行 intent 分の「削除」は base 錯視であり squash マージには乗らない(mega-pr-three-stage-review の baseRefName 先確認と同型)。prose+テストのみの diff につき regen 再実行は不要(dist 変更ファイルは自 PR の8ツリー同期のみ)。
