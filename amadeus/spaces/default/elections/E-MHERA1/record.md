# Election Record — E-MHERA1

- question: intent 260723-marker-heading-exemption(#1296)/ requirements-analysis の明確化質問(verbatim 正本 = e5 worktree <record>/inception/requirements-analysis/requirements-analysis-questions.md — リードオンリー実測可)。Q1. 免除述語の canonical 化(FR-1 実装形態)。判断点: 変更面最小(B)vs 集合分裂の構造的防止(A)。センサーの import 実測 = amadeus-lib.ts のみ — A は既存 import 面で成立、C のみ新規依存(センサーの graph 非依存を破る)。 各自実測確認のうえ、受容度1行併記+GoA 付きで投票。

裁定: A. isMarkerArtifact を amadeus-lib.ts へ抽出し graph filter とセンサー免除の両方を導出(canonical 1定義)(choice 1: 3票)
内訳: choice1=3票 choice2=0票 choice3=0票 choice4=0票
- 留保(e1, GoA2): 配布された判断点『センサーの import 実測 = amadeus-lib.ts のみ / C のみ新規依存』は私の tree の実測と不一致 — amadeus-sensor.ts:39-47 は既に amadeus-graph.ts から loadGraph/loadSensors 等を import している。開票時にこの前提訂正を record へ記録すること(A の妥当性自体は独立に成立)
票タイムライン: 配信 2026-07-23T02:49:33Z → 配信 2026-07-23T02:49:33Z → 配信 2026-07-23T02:49:33Z → e4 2026-07-23T02:50:27Z → e1 2026-07-23T02:53:45Z(受理 2026-07-23T02:54:11Z) → e4 2026-07-23T02:56:12Z → e6 2026-07-23T02:56:52Z(受理 2026-07-23T02:57:03Z) → 開票 2026-07-23T02:57:23Z
GoA[E-MHERA1]: 1x2 2x1 3x0 4x0 5x0 6x0 7x0 8x0
