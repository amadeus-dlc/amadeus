# Election Record — E-USSDP1R

- question: 260720-upstream-sync-230 / delivery-planning Q1（前提訂正版）: team-practices『plugin greenfieldを最初Boltでend-to-end』とE-USSUG1 e3留保『plugin contract/projection/composition/referenceを4独立Bolt』をどう両立するか。A=5-Bolt progressive skeleton（U01 stage-contract → U02 runtime-recovery → U09 plugin-projection → U10 plugin-composition → U11 reference-plugin-and-guides。plugin 4 Unitは独立Boltのまま、第5 Boltでe2e closure）。B=thin vertical Boltを追加後、4 Unitを完全化（重複と責務所有を明示）。C=plugin 4 Unitを最初の1 Boltへbundle（e3留保違反）。旧E-USSDP1はAのDAG前提が誤りのため無効・開票禁止。各自e5 questions、team-practices、UG裁定/留保、12 Unit DAGを実測し、GoA・非採用時受容度付きで投票する。全票はleader現行CLIで受理する。

裁定: A. 5-Bolt progressive skeleton（U01→U02→U09→U10→U11）(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票 choice4=1票
- 留保(e3, GoA2): 最初のthin vertical BoltはU10の必須前提U02を含むU01+U02+U09+U10+U11の最小e2e sliceとし、その後U01/U02/U09/U10/U11を各one-Unit Boltで完全化する。非採用時はA=7、B=6（U02をthin sliceへ追加する条件）、C=8。
- 留保(e2, GoA2): 5-Bolt列をWalking Skeletonの限定的な例外解釈としてDelivery Planningへ明記し、U01/U09/U10/U11の独立review・rollback・verification境界を崩さず、U11でend-to-end closureを必須化すること。
票タイムライン: e1 2026-07-20T08:09:05Z(受理 2026-07-20T08:09:39Z) → e3 2026-07-20T08:09:10Z(受理 2026-07-20T08:10:05Z) → e2 2026-07-20T08:09:56Z(受理 2026-07-20T08:10:26Z) → 開票 2026-07-20T08:12:26Z
GoA[E-USSDP1R]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
