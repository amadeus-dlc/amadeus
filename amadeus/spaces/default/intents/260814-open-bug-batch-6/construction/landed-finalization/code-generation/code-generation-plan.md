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

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T01:39:49Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 2件は是正済み — plan 全 9 step が [x]、FR-1 (3)(4) の述語は PR #3081 head (26f6d08f9) の実体で 4 本再検証して全件成立。新規 BLOCKER なし、FOLLOW-UP 2件・NIT 2件。

### Findings

- NIT | BLOCKER-1 是正確認 — code-generation-plan.md の Steps は 1〜9 全件が `[x]`(:7-:15、未チェック 0 件)。code-summary.md の宣言と矛盾なし: 逸脱節(:28)が『計画 Step 1-7 どおり。Step 8 の push/PR は conductor 実施』と述べ、Step 8(push→PR 作成)は PR #3081 が OPEN で実在(`gh pr view 3081 --json state` → OPEN)、Step 9(code-summary 作成)は当ファイル自身の存在で成立する。
- NIT | BLOCKER-2 是正確認(PR head 実体照合、測定 ref = PR #3081 head 26f6d08f91eb00292330f230e1bdc8b70e4c3c5f、取得は `gh api repos/amadeus-dlc/amadeus/contents/<path>?ref=26f6d08f9` の base64 デコード)— code-summary.md :30-:35 が記録した述語のうち 4 本を conductor tree ではなく PR head の実体へ再実行し全件成立。(1) 旧文言不在: `grep -c "landed is not convergence evidence"` を PR head の cli.ts / stages/pr-convergence.md / sensor.ts / sensors/*.md へ適用 → 全件 0・exit 1。対照として origin/main は `git grep -n ... -- plugins/` で 3 hit(cli.ts:823 / :1260 / :1365)・exit 0 を返すため、述語自体が反応する面であることを実測済み(不在が述語の無音失敗でないことの反証確認)。なお requirements.md:15 が第3層を `:1364` と記すのに対し origin/main の実位置は `:1365` で、1 行のずれがある。(2) 単一述語収束: `grep -n 'const settled'` → `1394:    const settled = verdict.converged || evaluation.value.kind === "landed";`(summary が引く行番号・逐語断片ともに一致)。(3) 新契約節: `grep -n "Already merged" stages/pr-convergence.md` → `305:**Already merged?** ...` の 1 hit(summary の `:305` と一致)。(4) 順序契約: `grep -c "auto-merge"` → 1(:299 近傍『auto-merge can land the pull request before `report` runs』を含む段落。実体は :305-:322 に『Recording it is how this stage finalises』以下の順序契約本文があり、self record も同一経路である旨(『Self-development records take the same path as every other record』)を明記)。
- NIT | FOLLOW-UP 是正確認(旧拒否3層の削除・二重経路なし・互換シム不在 — `gh pr diff 3081` の cli/sensor hunk 実読)— 3層はいずれも削除であって迂回・分岐追加ではない: (a) `writeSelfReport` 冒頭の `if (report.kind === "landed") return {exitCode:1,...}` を削除(旧 :823)、(b) `reportOutcome` の landed 分岐から `if (self !== null) return {exitCode:1,...}` を削除し、代わりに landed report を `const landed: ConvergenceReport` へ束ねて `self !== null` なら `writeSelfReport(..., "pr-convergence")`、そうでなければ従来どおり `writeReport(options, landed)` へ渡す(旧 :1260)、(c) `runConvergence` の `if (isSelfRecord(options.record) && evaluation.value.kind === "landed")` ガードを削除(旧 :1365)。self 専用の残余分岐は書込先(`writeSelfReport` — units ごとの投影と attestation を担う既存関数)のみで、merge fact 束縛・kind・converged:false の構成は非 self と同一オブジェクト `landed` を共有するため二重経路が構造上生じない。旧挙動を残すフラグ・環境変数・deprecated 経路・移行シムは diff 全体に不在。センサー側も `findings.push({field:"kind", reason:"landed is a merge fact, not convergence evidence"})` を無条件 push から `if (stage !== "pr-convergence")` の条件 push へ置換した削除+置換であり、旧判定の並存はない。`transitionAllowed` の追加も `created` からの遷移先集合への `|| next === "landed"` 1 項追加のみで、final state からの遷移追加はなく(`return current === "override" && next === "converged";` は不変)、code-summary.md:34 の帰属記述(『created epoch の report が存在する self record に landed report を書くには created→landed 遷移の許可が必要条件』)と実装が一致する。
- FOLLOW-UP | plan Step 7 の `bun run build`(全ハーネス再投影+追跡ファイル不変確認)が `[x]` である一方、code-summary.md にその実行証跡が 1 行もない — summary の検証節(:21-:24)が記すのは TDD Red→Green の pass/fail 数、落ちる実証、coverage registry regen(`--check` OK)、typecheck / lint green のみで、build の実行有無・`git status` 等の追跡ファイル不変確認の結果は記録されていない。本 unit は `plugins/github-pr-convergence/**` を触るため投影先(`dist/<harness>/` と self-install 面)が変わる面であり、project.md Mandated の『正本を編集し `bun run build` で未追跡の dist を再生成、追跡ファイルが不変であることを確認』が適用される。同 summary の FR-1 (4) 実測(:33)は『全ハーネス投影 `dist/` で該当ファイル 0 件』と述べており build 後の tree を観測した形跡はあるが、build の実行そのものと追跡ファイル不変の確認は別命題で、前者から後者は導けない。BLOCKER としない理由: PR の変更ファイル集合(`gh api .../pulls/3081/files`)に追跡された `dist/` 配下は 1 件も含まれず(全 46 件が `amadeus/` record・`plugins/`・`tests/` のみ)、追跡ファイルの汚染が実際には起きていないことが配送断面で確認できるため。是正の形: summary へ build 実行コマンドと `git status --porcelain` の出力(または『追跡ファイル差分 0』の実測)を 1 行追記する。
- FOLLOW-UP | code-summary.md :7-:8 の行数表記 `(+17/...)` `(+20)` `(+32)` `(+7)` は `git diff --stat` の総変更行(追加+削除の合算)であって追加行数ではなく、`+` 記号が追加のみを示すと誤読される — PR head の実測(`gh api repos/amadeus-dlc/amadeus/pulls/3081/files --jq '.additions, .deletions'`)は cli.ts が +9/-8(計 17)、sensor .ts が +18/-2(計 20)、stages/pr-convergence.md が +24/-8(計 32)、sensors/*.md が +5/-2(計 7)で、4 件すべて summary の数値と合算値が一致する。したがって転記自体は正確で数値の捏造はなく(:35 が測定 ref を『`git diff --stat origin/main..HEAD`(origin/main = 8b36a0ad0)の転記』と明記しているのも整合)、問題は表記の曖昧さのみ。t3062 の『285 行』は additions 285 と厳密一致する。是正の形: `+17` を `17 changed (+9/-8)` の形へ改めるか、数値が stat の総変更行である旨を測定 ref の行へ 1 語添える。なお summary の測定 ref は worktree HEAD = 144ffa39(pr-convergence-report.md:17-19 の local/remote/pr head と一致)だが、本レビュー時点の PR head は 26f6d08f9 へ前進している。差分は record checkpoint 系のみで `plugins/` / `tests/` の 4 ファイルの stat が完全一致することから、コード面の実測値は現 head でも有効。
