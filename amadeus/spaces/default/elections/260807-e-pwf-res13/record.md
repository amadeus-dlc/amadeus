# Election Record — E-PWF-RES13

- question: 260807-projectdir-worktree-fix reverse-engineering ステージの §13 学習候補5件の採否を裁定する。候補は c1: xrev scan mode 適用の実例（cid:reverse-engineering:c1-xrev-single-issue の適用記録）/ c2: 行番号 currency の区間実測確定（E-XBB-RE-S13-c2 の適用実例 — review→observed で amadeus-lib.ts +143行が全て :4983 着地、患部区間 cmp IDENTICAL）/ c3: 差分 base 選定（rescan-base-ancestry の適用実例）/ c4: re-artifacts.md テンプレが greenfield 全域スキャン向け節構成のため xrev differential では依頼項目を主構造としテンプレの証拠規律のみ適用した様式判断 / c5: worktree 隔離ガードにより他 worktree 跨ぎの全域再計数が実行不能だった制約記録。各候補の実在根拠は record（inception/reverse-engineering/memory.md）と re-scans/260807-projectdir-worktree-fix.md を実測確認のこと。判定規準: 既存 cid の単なる適用実例は新規ノルムに値しない（persist は既存 cid の追補・新規 cid・退役のいずれかに実質があるときだけ）。

裁定: c4 のみ採用（テンプレ適用境界の追補）(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票 choice4=0票
- 留保(subagent-2, GoA2): c5 は既存 cid:code-generation:c1-pcp-isolated-session-swarm-incompat が既に「conductor も subagent も直接の git 操作・Write・EnterWorktree(path) が構造的に拒否される」と明記しており、read-only 全数計数の拒否はその射程内と読める。加えて record 側の証拠が弱く（memory.md:13 / re-scans:206 とも拒否の verbatim ガード文言・exit code を残していない）、norm 化の実測接地が不足する。read-only census も拒否されるという facet が verbatim ガード証拠付きで再発した場合は、同 cid への追補として再提案してよい。
- 留保(subagent-1, GoA2): persist は新規独立 cid でなく xrev 系 cid（c1-xrev-scan-mode / c1-xrev-single-issue）への1行追補とし、intent 固有の数値・固有名を落とした一般形（re-artifacts.md の Developer Code Scan Template は greenfield 全域スキャン向け節構成であり、xrev differential では依頼項目を主構造としテンプレの証拠規律のみ適用する）で書くこと。
票タイムライン: 配信 2026-08-07T10:15:14Z → 配信 2026-08-07T10:15:14Z → subagent-2 2026-08-07T10:17:08Z → subagent-1 2026-08-07T10:17:18Z → 開票 2026-08-07T10:25:57Z
GoA[E-PWF-RES13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
