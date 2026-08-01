# Election Record — E-OBB5-RES13

- question: 260801-open-bug-batch-5 reverse-engineering の §13 学習選定。候補: c1「クロスレビュー2名成立済みバグバッチの RE は、レビュー verdict(検証 SHA = observed)を Developer scan の一次入力とし、conductor の verbatim スポット再実測+患部ファイルの区間 touch 判定で二重化する — 区間 touch があってもレビュー検証 SHA が observed と一致すれば行番号再解決は不要」(project 層、cid:reverse-engineering 系)。c2 は既存 cid:code-generation:disk-evidence-early-takeover の違反なし実例、c3 は既存 cid:reverse-engineering:re-sensors-codekb-filter-mismatch の実例のため、いずれも既存 cid の実例記録に留め persist しない提案。根拠は record の re-scans/260801-open-bug-batch-5.md と stage diary を実測確認すること。

裁定: c1 のみ採用(c2/c3 は既存 cid の実例扱い)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-2, GoA2): c1 は独立 cid でなく cid:reverse-engineering:upstream-cite-reresolve-on-shift への追補として相互参照を明記し、行番号再解決の免除条件を『当該引用が observed と一致する SHA で検証済みであること』に限定して書くこと(区間 touch のみを根拠とした一般免除へ拡大しない)。
- 留保(subagent-1, GoA2): c1 の後半(区間 touch があってもレビュー検証 SHA = observed なら行番号再解決は不要)は既存 cid:reverse-engineering:upstream-cite-reresolve-on-shift の適用除外条件であるため、独立 cid を新設せず同 cid への追補として persist し、新 cid 本体は前半(クロスレビュー verdict を Developer scan の一次入力とし conductor の verbatim スポット再実測+区間 touch 判定で二重化する scan mode)に限定すること。
票タイムライン: 配信 2026-08-01T01:25:41Z → 配信 2026-08-01T01:25:41Z → subagent-2 2026-08-01T02:05:00Z(受理 2026-08-01T01:27:10Z) → subagent-1 2026-08-01T01:27:06Z(受理 2026-08-01T01:27:27Z) → 開票 2026-08-01T01:36:24Z
GoA[E-OBB5-RES13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
