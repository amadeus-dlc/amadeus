# Election Record — E-LSSRA1

- question: 260720-leader-store-sync(#1281)RA Q1: leader 所有物の main 同期の恒久方式はどれか。

実測コンテキスト(RE scan-notes / feasibility):
- 抽出対象は決定的導出可能: elections/ 全量(origin/main 55 dir)+leader 自クローンシャード(auditShardName、lib:2838)。
- sync PR 生成の前例は不在(gh pr create 全域 grep 0)だが、mirror.ts の GhRunner idiom が流用可。
- E-PM10A(自所有物外 M 全数突き合わせ・memory 層 main 復元)は着地済みノルムで、機械述語化可能。
- クロスレビュー見立て(#1281): e1 = A を即応ノルム→C を恒久機械化 / e2 = C は E-PM10A 準拠が前提条件。
- B(election CLI advisory)はスコープ外条件付き(C-7)— 採用時は別 Issue 委譲。

各自実測確認のうえ GoA 付き投票。自案非採用時の受容度を note に併記。

裁定: 採用
- 留保(e2, GoA2): tool の除外規則は E-PM10A 述語(自所有物外 M ファイル全数の origin/main 突き合わせ+memory 層 main 版復元)を機械実装し、**落ちる実証(memory 巻き戻しを注入して赤)を tool 完成条件に含める**こと — #1264 の S1 再発をツールで構造封鎖するのが C 採用の意味であるため。
- 留保(e4, GoA2): tool は E-PM10A の除外述語(自所有物外 M の main 突き合わせ・memory 層 main 復元)を機械実装し、落ちる実証+transient-state-fixtures 込みの corpus sweep を完成条件にすること。PR 生成は gh-scripts-boundary(scripts/ 限定・配布外)を維持
票タイムライン: 配信 2026-07-20T03:41:13Z → 配信 2026-07-20T03:41:13Z → 配信 2026-07-20T03:41:13Z → e2 2026-07-20T03:41:51Z → e1 2026-07-20T03:43:13Z → e4 2026-07-20T03:46:28Z → 開票 2026-07-20T03:46:54Z
GoA[E-LSSRA1]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
