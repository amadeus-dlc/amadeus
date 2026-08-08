# Election Record — E-SPR-BTS13

- question: intent 260807-stage-perf-report の build-and-test ステージ §13 学習選定。diary は amadeus/spaces/default/intents/260807-stage-perf-report/construction/build-and-test/memory.md(Interpretations 2 エントリ)。候補 c1: フルスイート失敗の帰属判定で、未改変ベースでの単純再実行では足りず、ambient 入力(アクティブ intent の runtime-graph + カーソル)だけをベースへ植えた対照実験で同一再現を作って初めて帰属が確定した(素のベース = 3件 green、ambient 植え込み = 3件とも同一に赤)。候補 c2: 初回赤 38 assertion のうち 35 が依存未インストール(ast-grep の TOOL_MISSING)で、コード欠陥と見分けがつかなかった。conductor の提案は「c1 のみ採用(c2 不採用)」— 根拠: (1) 既存 cid:build-and-test:bt-20260730-2 は『環境起因の分類は未改変ベースでの同一失敗集合の再現後にのみ行う』と定め、cid:build-and-test:c4-260805-subagent-type-guard はその比較手順(分離 worktree・失敗集合 diff・比較条件の同一性)を定めるが、いずれも『ベースで再現しない場合に ambient 入力を再現条件へ加える』段を持たない — 素のベース比較だけだと ambient 依存の既存欠陥を自変更由来と誤帰属する未被覆の増分 (2) c2 は環境セットアップの運用知識で、成果物(build-instructions のトラブルシューティング表)へ記録済みであり memory 層への一般化価値が薄い。各自 diary・build-test-results.md の帰属節・project.md / team.md の当該 cid を独立に読み、GoA 付きで投票すること。

裁定: 0件で可(choice 2: 2票)
内訳: choice1=0票 choice2=2票 choice3=0票
- 留保(subagent-1, GoA2): 0件は「学びが無かった」ではなく「既に persist 済み」の意味であり、もし team が生成物 byte-copy 面(TSR 追補の除外条項との関係)を明文化したいと判断するなら、新規 cid ではなく cid:build-and-test:c1-tsr-ambient-repro-on-base への1行追補に限定すべき。
- 留保(subagent-2, GoA2): 0件で可とするが、本ランの手順(runtime-graph.json を byte-copy して植える)は既存 cid:build-and-test:c1-tsr-ambient-repro-on-base が明文で除外する形であり、0件裁定は『既存則に覆われている』であって『本ランの手順が既存則に適合していた』ことの追認ではない — この不整合(生成物 byte-copy による自変更由来の masking リスク)は diary/申し送りに残し、必要なら別途ノルム矛盾監査または既存 cid の改訂選挙として扱うこと。
票タイムライン: 配信 2026-08-08T05:08:39Z → 配信 2026-08-08T05:08:39Z → subagent-1 2026-08-08T05:10:56Z → subagent-2 2026-08-08T05:11:43Z → 開票 2026-08-08T05:20:57Z
GoA[E-SPR-BTS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
