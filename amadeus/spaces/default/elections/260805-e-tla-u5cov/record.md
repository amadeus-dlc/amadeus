# Election Record — E-TLA-U5COV

- question: PR #2312(U5 authoring-stage-e2e)の CI Project Coverage Gate 赤(ABSOLUTE_MINIMUM_NOT_MET: current 75.66%、universe が 17,648→116,489 行へ膨張)の是正方式。機序は一次実測で確定済み: t450 E2E が composed host(os temp 配下へ compose したコピー)を in-process 動的 import するため、bun --coverage が temp コピー群を計測し lcov SF に混入(t450 単独プローブで 110 SF 中 100 が /var/folders 配下)。collectCoverageTotals(tests/run-tests.ts:459)は SF を無フィルタで合算するため universe が膨張し、project % が 92.19%→75.66% へ希釈された。どの方式で是正するか。

裁定: A: テスト側 spawn 化 + collector 修正は後続 Issue(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): A の前提である「temp コピーが lcov に入らない」は bun の spawn 盲点という契約なき実装差に依存するため、collector 恒久修正(repo 外 SF 除外)の enhancement Issue 起票を A の完了条件として明示し、spawn 化後は BR-U5-09 の検証点が in-process 版と同等に残っていることを実測確認すること。
- 留保(subagent-1, GoA2): A を採るのは是正の恒久性を諦めるからではない。(1) collector 側の恒久修正は enhancement Issue として本 PR のマージ前に起票し、Issue 番号を PR 本文と U5 の record へ書き残すこと(黙ったままの先送りは no-silent-scope-narrowing に触れる)。(2) spawn 変換後の E2E は、driver script の非 0 exit・非 JSON stdout・stderr の module 解決失敗を必ず loud fail させ、BR-U5-09 が観測していた事実(composed host 上で実際に解決・実行されたこと)を JSON 経由でも逐語的に保持すること — process 境界を挟んだことで assert が弱まると検証劇場になる。(3) 変換後に実測で閉包を確認すること: merged lcov の SF に /var/folders 等の repo 外パスが 0 件であることを grep の出力で示し、project % が回復したことを CI の Coverage Gate 出力から転記する(見込みで完了としない)。
票タイムライン: 配信 2026-08-05T16:37:03Z → 配信 2026-08-05T16:37:03Z → subagent-2 2026-08-05T16:38:45Z(受理 2026-08-05T16:39:05Z) → subagent-1 2026-08-05T16:40:00Z(受理 2026-08-05T16:39:10Z) → 開票 2026-08-05T16:39:33Z
GoA[E-TLA-U5COV]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
