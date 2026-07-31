# Election Record — E-OBB2-CG1

- question: PR #1774(FR-1769)のレビューで顕在化した要件内曖昧さの裁定。FR-1769a は「uncovered がちょうど1つなら解決、uncovered 0件/複数件は fail-closed」、FR-1769c は「単一 dir の既存挙動(解決)は不変」と定めるが、『単一 dir かつ全充足(uncovered 0件)』のケースで両者が矛盾する。builder は FR-1769c を優先し単一候補を coverage 判定前に無条件解決(amadeus-orchestrate.ts:3078)、CodeRabbit Major が「完了済み単一候補の再実行」と指摘。

運用文脈: 全充足時の directive は conductor が §12a レビューと承認ゲートで使う。ただし conductor は各 unit の build 時(uncovered-unique で解決された時点)に directive を保存して再利用できるため、全充足 fail-closed でもゲート運用は成立する(複数 dir 全充足は既に fail-closed = test 13)。

A. 一様な uncovered-unique 規則: 単一 dir でも全充足なら fail-closed(「新しい unit dir を作成」指示)。意味論が単一/複数で一貫し、完了済み作業の再 run-stage 発行を防ぐ。FR-1769c の「単一 dir 不変」は「uncovered な単一 dir」に限定して読み替え(t367 test 1 は uncovered なので不変)。conductor はゲート時に build 時保存の directive を再利用する運用を record に明記。
B. 単一 dir は常に解決(現実装維持): ゲート時の directive 再取得が常に可能で運用が単純。ただし単一/複数で意味論が非対称になり、完了済み単一 unit の再 run-stage 発行を許す。

実在根拠(orchestrate :3078 付近の実装、t367 test 1/13 の期待、FR-1769a/c 原文)を実測確認して投票せよ。

裁定: B: 単一 dir 常時解決(現実装維持、CodeRabbit 指摘は意図的相違として却下返信)(choice 2: 2票)
内訳: choice1=0票 choice2=2票
- 留保(subagent-1, GoA2): B 採用にあたり、(1) CodeRabbit への却下返信では「単一 dir 全充足で発行される directive は再実行指示ではなくステージゲートの提示であり、DAG 経路の全充足分岐(emitPerUnitRunStage の pickUnit === null、amadeus-orchestrate.ts:3198-3216)と同義」であることを機構引用付きで示すこと、(2) 「単一 dir 全充足 → ゲート付き directive(kind: run-stage、gate 真)」を t367 に固定テストとして追加し、FR-1769c の意図が再係争されないようにすること、を条件とする。
- 留保(subagent-2, GoA2): B 採用にあたり、単一 dir covered が意図的に解決される契約を t367 へ回帰テストとして固定し(現状 test 1 は uncovered のみ、covered 単一を張る test が無い)、複数 dir 全充足(test 13)との非対称が『曖昧性の有無』に由来する意図的相違であることをコード注記と CodeRabbit 返信の両方に明記すること。
票タイムライン: 配信 2026-07-30T16:34:09Z → 配信 2026-07-30T16:34:09Z → subagent-1 2026-07-30T16:35:58Z(受理 2026-07-30T16:36:28Z) → subagent-2 2026-07-30T16:37:53Z(受理 2026-07-30T16:38:00Z) → 開票 2026-07-30T16:38:06Z
GoA[E-OBB2-CG1]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
