# Election Record — E-SSP-RES13

- question: 260807-subagent-start-pair reverse-engineering ステージの §13 学習候補3件の採否。c1: xrev mode + 区間実測 currency（既存 cid の適用実例）。c2: base 選定（既存 cid の適用実例）。c3: Architect subagent が worktree 隔離セッション内で一部検証を誤って本線 checkout 側で実行し、異なる実測値を得てから worktree で全件取り直した自己申告 — 「worktree 隔離セッションの subagent は検証コマンドの実行ディレクトリを本線と取り違えうる（絶対パス指定・cwd 確認を検証手順に含める）」という一般化候補。実在根拠は record（inception/reverse-engineering/memory.md）と synthesis 報告。判定規準: 既存 cid の適用実例は不採用、新規未被覆面のみ採用。c3 は既存 cid（c2 の worktree ディスパッチ規律 = 本線パス混入禁止・E-TCRCGS13 の resume 時 cwd 実測）で覆えているかを grep で判定のこと。

裁定: 採用0件(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): c2 の resume 追補が明文で縛るのは『resume 時』の cwd/branch 実測であり、fresh な隔離 subagent が自発的に本線側で read-only 検証を走らせる経路は逐語では名指されていない。したがって c3 は既存 cid の逐語射程にわずかに外れる余地がある。それでも不採用としたのは、(a) 危害クラス『どの tree で数えたかが違うと実測値が変わる』は cid:reverse-engineering:measurement-ref-in-artifacts と cid:requirements-analysis:enumeration-check-at-observed が既に一般形で覆っており、(b) record 自身が本件を historical-section-cite-check-at-observed の実践形と分類し、(c) 新機序でなく成果物汚染もなく自己捕捉・全件取り直しで閉包しているため。同型が別 intent で再発し、かつ既存 cid の適用では防げなかったと実測できた時点で、c2 への追補（1行）として再提案するのが妥当。
- 留保(subagent-2, GoA2): E-TCRCGS13 追補の文面は resume 経路に係留されているため、同型の実行ツリー取り違えが resume を経ない新規ディスパッチで再発した場合は、独立 cid でなく cid:code-generation:c2 への追補として再提案する余地を残す。
票タイムライン: 配信 2026-08-07T13:18:19Z → 配信 2026-08-07T13:18:19Z → subagent-1 2026-08-07T13:20:10Z → subagent-2 2026-08-07T13:20:19Z → 開票 2026-08-07T13:20:26Z
GoA[E-SSP-RES13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
