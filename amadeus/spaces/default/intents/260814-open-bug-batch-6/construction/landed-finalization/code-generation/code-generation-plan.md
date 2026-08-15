# Code Generation Plan — U-1 landed-finalization(#3062 / FR-1)

depth Minimal。選挙裁定 A(D-1: landed 記録方式)の実装。トレース: 全 step → FR-1。TDD 必須(実行可能な振る舞いの変更)。worktree bolt-landed-finalization(base: origin/main)で実装し push-first。

## Steps

- [x] Step 1: 現行断面の患部再実測 — pr-convergence-cli.ts の self×landed 拒否 3層(:823/:1260/:1364 近傍を現 HEAD で再解決)、センサーの landed 拒否(:368-372)、stage 文書の契約節、predicate の landed verdict、非 self 経路の landed report が書く merge fact フィールド集合を実読で確定。RE 指摘の波及候補 3 モジュール(pr-convergence-attestation/ledger/provenance)の landed kind 消費有無を grep で実測し射程を確定 → FR-1
- [x] Step 2: TDD Red — self record × merged PR で report(kind: landed)書込が成立することを検証する失敗テストを既存テスト面(plugins/github-pr-convergence の既存スイート)の公開 seam へ追加し、Red を実測 → FR-1 (1)
- [x] Step 3: CLI 是正 — 3層の self×landed 拒否を削除し、self でも非 self と同じ landed 分岐(merge fact 束縛の report 書込、kind: landed、converged:false 維持)へ到達させる。旧経路は削除して置換(二重経路なし)。Green を実測 → FR-1 (1)(3)
- [x] Step 4: TDD Red→Green — センサー: pr-convergence ステージの landed report を merge commit 検証付き(mergeCommitOid 実在・PR 対応)で合格、検証欠落・他 stage・未 merge は従前 fail。失敗テスト先行 → FR-1 (1)(2)
- [x] Step 5: 落ちる実証 1 セット — merged fixture → sensor pass / 未 merge・未収束 fixture → fail を実 corpus 様式の fixture で実測し、注入→赤→revert の残渣ゼロを機械確認 → FR-1 (2)
- [x] Step 6: stage 文書改訂 — pr-convergence.md(en 正本)の「landed is not convergence evidence」契約を「landed は既に起きたマージの記録事実」へ改訂し、auto-merge と report の順序契約を明記。grep 述語(旧文言 0 hit / 新契約節 1+ hit)を全ハーネス投影で実測 → FR-1 (4)
- [x] Step 7: bun run build で全ハーネス再投影、追跡ファイル不変確認。coverage-registry regen(新規テストファイル追加時)。typecheck / lint / 対象テストのローカル green(秒〜十秒級のみ)
- [x] Step 8: commit → push → PR 作成(pr-convergence-cli create、record checkpoint 同梱)。重い検証(フルスイート・coverage)は CI と並列 → NFR-3
- [x] Step 9: code-summary.md 作成

## テスト方針(Comprehensive)

Red→Green の vertical slice を Step 2-5 で反復。エラーパス(検証欠落 landed report の fail、未 merge fail)も対象。時間アサーションは導入しない。
