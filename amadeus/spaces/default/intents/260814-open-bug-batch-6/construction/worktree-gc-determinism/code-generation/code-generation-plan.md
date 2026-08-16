# Code Generation Plan — U-4 worktree-gc-determinism(#3031 / FR-4)

depth Minimal。D-4(判定分岐先行)の実行。トレース: 全 step → FR-4。

## Steps

- [x] Step 1: 一次証跡判定 — PR #3056 の retry 発火条件が CI run 31772609914 attempt 1 の観測失敗を覆うかを、attempt 1 ログの stderr 逐語と条件文字列の機械照合で判定(読取専用調査、conductor 委譲の probe で実施済み) → FR-4 (a)
- [x] Step 2: 判定 =「覆う」の場合 — 是正 0 件の根拠として一次証跡を record(primary-evidence-log.md)へ確定記録 → FR-4 (a)
- [x] Step 3: 対称面棚卸し — fixture 準備に retry なしの実 `git worktree add` を使うテストの全数列挙(検索述語併記)→ 同一リスクは修正でなく起票 → FR-4 (c)
- [x] Step 4: 棚卸し結果の起票(1 Issue、8 箇所の列挙) → FR-4 (c)
- [x] Step 5: record checkpoint の配送(PR)と report mint、code-summary 作成

## テスト方針

判定 =「覆う」のためコード・テスト変更 0 件(FR-4 (a) の分岐どおり)。時間アサーション裁定に抵触する変更なし。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T02:43:46Z
- **Iteration:** 1
- **Scope decision:** none

FR-4 (a) の3条件・(c) の棚卸し述語を独立に再実行して全件再現、ソース変更0件と時間アサーション非抵触も PR 実態で確認。BLOCKER なし、FOLLOW-UP 4件・NIT 3件。

### Findings

- NIT | FR-4 (a) の一次証跡は独立再実行で全件再現した — `gh run view 31772609914 --attempt 1 --log-failed`(exit 0、29,292 行、record の行数と一致)の 16923 行目に観測 stderr が逐語で1回だけ出現(`2026-08-14T05:30:25.5559529Z error: fatal: could not open '.git/worktrees/feature-copy/locked' for writing: No such file or directory`、`grep -c` → 1)。条件 (c) は python3 `cond in obs` → True、条件 (a) は同ログの `Received: 128`、条件 (b) は `git show 653a24aa148457f31efa88b877884bb3a1f72d7a:tests/integration/t-worktree-gc.test.ts` の 169 行目が逐語 `git(fixture.repo, "worktree", "add", "-q", "--detach", featureCopy, "feature/current");` で `args[0]==="worktree" && args[1]==="add"` を満たす。ログには当時のソース断片(15-16 行、retry なし)も埋め込まれており、retry 導入前の断面であることが同一証跡内で自己完結して示される。現行 retry 実装(a49f9e9fd の :14-28)は record の逐語引用とバイト一致。判定「覆う」は成立。
- NIT | record が「現行バイト」を pin する a49f9e9fd と配送 PR #3089 の head 78bd028108 の差を独立確認した — `tests/integration/t-worktree-gc.test.ts` の blob は両断面で同一(b90f681d8b53e934eac08803063cec536593964f)、かつ a49f9e9fd は 78bd028108 の祖先(`git merge-base --is-ancestor` exit 0)。したがって record の retry 逐語引用は配送 head でも有効で、pin 断面と配送断面の乖離による証跡失効はない。
- NIT | ソース変更0件の宣言は PR 実態と整合するが、code-summary の変更ファイル数が PR のパス数と一致しない — `gh pr diff 3089 --name-only` は 5 パスを返し、全件が record 配下(code-generation 配下の4成果物+監査シャード `audit/j5ik2o-mac-studio-lan-79214d15bd81.jsonl`)。ソース・テストのパスは 0 件で「ソース変更0件」は成立し、`git status --porcelain tests/integration/t-worktree-gc.test.ts` も空(所有ファイル未改変)。ただし code-summary:18 は『record 3 ファイル+pr-convergence-report』= 4 と述べ、監査シャードを数に含めていない。同梱自体は org.md のチェックポイント規約どおりで正当だが、実測転記としては PR の 5 パスと不一致。是正の形: 変更ファイル節を `gh pr diff --name-only` の出力そのままに揃えるか、監査シャードを別枠として明記する。
- FOLLOW-UP | code-summary:8 の一般性主張が retry の実際の射程より広い — 『locked は git のロックメタデータファイル名であり worktree 名非依存』までは正しい(条件文字列は `/locked'` から始まるため `.git/worktrees/<任意名>/locked` に一般に一致する。実測: 観測パスの `feature-copy` 部分は条件文字列の外側)。しかし続く『条件は一般に成立(将来の同型失敗も覆う)』は2点で射程を超える: (1) 条件は失敗ファイルが `locked` である場合に限定され、同じ prune race が `gitdir` / `commondir` 等の別メタデータファイルで失敗した場合は発火しない (2) retry は単発の再 spawn 1回のみ(:14-28)であり、再試行時にレースが再発すれば赤になる。FR-4 (a) が要求するのは『観測失敗を覆うか』であり、その判定は成立しているため分岐選択は妥当だが、この一般性主張は code-summary:22 の #3031 クローズ提案(『決定的化』の達成)の根拠として読まれる位置にある。是正の形: 『将来の同型失敗も覆う』を『観測された stderr 様式(`locked` メタデータ書込失敗)に限り、かつ再試行1回の範囲で覆う』へ限定し、確率的緩和であって決定性の保証ではない旨をクローズ提案の但し書きに添える。
- FOLLOW-UP | 対称面棚卸し(FR-4 (c))は述語・件数・起票内容とも独立再現したが、除外リストの会計が全数を閉じていない — 述語1 `git grep -ln "worktree" -- 'tests/'` → 142 ファイル(record と一致)、述語2 → 56 hit。8 箇所の同一リスクは全件が記載どおりの file:line で再現し、Issue #3088 の表・述語・observed ref(a49f9e9fd)は record と一字一致、種別 bug + P3 + S4-MINOR も Issue taxonomy ノルムを満たす(`gh issue list --state all --search "worktree add fixture"` で重複 open Issue なしも確認)。ただし 56 hit のうち `tests/integration/t-worktree-gc.test.ts` 自身の 13 呼出(:60/73/86/99/114/127/142/158/162/176/180/193/207)は、retry ヘルパ経由であるため除外されているのに除外リストに1件も挙がっていない(除外リストは他ファイルのみを列挙)。読み手は 56 = 8 + 除外 の会計を自力で再構成する必要がある。是正の形: 除外リストへ『被検ファイル自身の呼出 13 件(retry ヘルパ経由のため対象外)』を1行追加し、56 hit の内訳が閉じることを示す。
- FOLLOW-UP | 述語2 の盲点と起票前重複検索が記録されていない — 述語2 `worktree\"?,? *\"?add|worktree add` は `"worktree",` と `"add"` が別行に分かれた呼出を構造的に取りこぼす。本レビューで `git grep -n -E '\"worktree\",\s*$' -- 'tests/'` を実行して 0 hit(exit 1)を確認したため結論は不変だが、record は述語の盲点とその反証確認を記していない(cid:reverse-engineering:c6-absence-predicate-exit-code / 消費者棚卸しの複数軸検索キーの要求)。あわせて team.md の起票前重複検索(cid:requirements-analysis:pre-filing-dup-and-branch-check)を実施した述語が record にも #3088 本文にも残っていない。是正の形: 述語節へ『改行分割形は 0 hit を実測(述語併記)』の1行と、重複検索の述語・結果を追記する。
- FOLLOW-UP | code-generation-plan がステージ契約の必須テスト手順を持たないが、逸脱の帰属先が FR-4 のみで書かれている — ステージ契約(.claude/amadeus-common/stages/construction/code-generation.md:30,35-39)は『Test files are MANDATORY in the plan』『If the plan presented to the user omits test file steps, add them before presenting』『Tests are not deferred to Build and Test』と明記する。本 plan の『テスト方針』節は『判定 =「覆う」のためコード・テスト変更 0 件(FR-4 (a) の分岐どおり)』とだけ述べ、逸脱を承認済み FR-4 (a) へ帰属させている。振る舞い変更が 0 である以上テスト追加は検証劇場(project.md cid:build-and-test:c2-no-test-theatre-for-absent-nfr、team.md TDD 適用外の『振る舞いを持たない変更』)であり、無申告の逸脱(P3)には当たらないため BLOCKER としない。ただし『どの上位契約から、どの根拠で外れたか』が本文に無いため、次の読み手は plan 単体からこの省略の正当性を再構成できない。是正の形: テスト方針節へ『ステージ契約の必須テスト手順は、コード変更 0 件により適用対象が存在しないため非適用(根拠: FR-4 (a) 分岐 + no-test-theatre 規律)』の1行を足す。
