# Election Record
Election ID: E-260820-FMC-CG-S13
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-learnings-selection: code-generation (intent 260820-fmc-drift-batch、swarm 2 batch / 4 unit / PR 4本配送) の §13 学習選定。surface 候補5件のうち採用提案は2件: 【L-A(c1/c5 統合)】swarm invoke 時の配送形の確定 — swarm finalize のローカル merge 段(main checkout HEAD 必須 + local trunk merge)は本プロジェクトの確定済み配送規範(FR-X-2: Bolt PR + merge queue)と構造的に衝突するため使わず、referee は pool 管理 verb(resolve/prepare/acquire/confirm-dispatch/check/settle-release)までを正とし、配送は per-unit PR(record bundle → create → converge → queue)で行う。engine は finalize なしでも pool terminal で次 batch を発行する(実測)。SKILL 契約からの乖離は毎回 diary へ記録する。【L-B(c2)】t146 衛生クラスの拡張実測 — plugin .md prose(sensor manifest の glob 分岐含む)内の repo-root 相対 plugins/<x>/tools/ パスリテラルは t146 が拒否する。glob では */plugins/... の anchored 形が意味論を保存して回避できる(本番 matchesGlob で事前検証する手順込み)。不採用提案: c3(patch coverage の error-path クラス — 既存 TDD 既定 cid:code-generation:tdd-default-with-narrow-exceptions のエラーパス条項の適用例)、c4(record 事後化での FOLLOW-UP 閉包点パターン — 既存 cid:build-and-test:c5-260809-followup-routing の適用例)。
Established: L-A + L-B 両方採用 (choice 1)
Choice counts:
- Choice 1 L-A + L-B 両方採用: 2
- Choice 2 L-A のみ採用: 0
- Choice 3 L-B のみ採用: 0
- Choice 4 0件で可: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-21T00:15:00Z] GoA 2: 両方とも実測で裏付けが取れ既存 project.md/team.md に重複がない新規知見だと確認した。L-A: amadeus-worktree.ts:369-415 の handleMerge は main checkout の HEAD==--target を要求しローカルで squash/merge/rebase する実装であり、SKILL の finalize 契約と project.md FR-X-2(Bolt PR + merge queue 経由のスカッシュのみ)は構造的に衝突する。conductor の per-unit PR 配送への倒しは既決要件の機械適用で P3/P1 整合。ただし一度きりのワークアラウンドで終わらせず、swarm finalize に PR配送・no-local-merge モードを与えるフレームワーク Issue の起票を伴わせるべき — 本ノルムはその Issue 着地までの暫定運用と明記し、次回蒸留で起票状況を確認すること。L-B: ROOT_RELATIVE_PLUGIN_PATH_RE を直接評価し ',plugins/x/tools/' = 拒否、'/plugins/x/tools/' と '*/plugins/x/tools/' = 通過を確認。'./plugins/...' '../plugins/...' は別選択肢で依然拒否される点も併記した方が誤読を防げる。
- Reservation subagent-2 [original:2026-08-21T00:15:00Z] GoA 2: L-A の局所整合を再検証: handleMerge(:369-415)は main checkout で HEAD==--target を要求しローカル本線で squash/merge/rebase、finalize の targetFor 既定は prepared base ?? main(~:1210)— CI/CD の必須 Merge Queue Ruleset と構造的衝突を確認。実配送は 4 Bolt PR(#3362/#3363/#3364/#3374 全 MERGED を gh 実測)で finalize ローカル merge 不使用、orchestrate は finalize を next batch 発行の前提にしていない(コメント参照のみ :5937)。L-B は regex 直接実行で `,plugins/x/tools/` 拒否・`*/plugins/x/tools/` 通過を確認し、PR #3364 実 diff の anchored 形着地も確認。重複 grep なし。留保: L-A は本 intent の workaround としては正しいが、swarm finalize 契約自体が merge-queue 必須プロジェクト全般と衝突する再発性課題のため、norm 記録に加え framework Issue(swarm finalize と merge-queue 前提配送の非互換)の起票を推奨する。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-21T00:11:09Z run=run-1