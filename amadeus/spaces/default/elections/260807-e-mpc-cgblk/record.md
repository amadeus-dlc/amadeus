# Election Record — E-MPC-CGBLK

- question: Bolt 1(landed-report)実装前停止の設計逸脱裁定: FD 仕様の3項(RawPrState への state 追加 / resolvePrLifecycle の無条件 parse(未知値 throw) / 既存 t448 無改変 green)が同時充足不能と builder が実測立証した。機序: t448:181-198 は旧形 payload {mergeable, mergeStateStatus} に対し toEqual を assert(Bun の toEqual は追加プロパティが定義値でも null でも fail — scratch 実測 1 pass 2 fail)。t448 の CLI 系テスト(cliSpawn :275-292)は state を含まない旧形 payload を replay するため、無条件 PrLifecycleState.parse(undefined) は throw → exit 2 で全滅する。『state 欠落応答』の扱いは仕様未規定で、本番でも到達可能(スキーマ欠落応答の fail-open/fail-closed 判断)。各投票者は builder の実測(t448:181-198 の toEqual・cliSpawn の payload 形・Mergeable.parse :132-138 の同形性)を bolt/landed-report ブランチ相当の現行 main ソースで独立検証し、fail-open 残余のリスクと AC/テスト契約の保存を比較衡量して投票せよ。

裁定: 案A: absent-undefined 許容 + resolvePrLifecycle に undefined ガード(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-2, GoA2): fail-open 残余(state 欠落応答が無音で active 経路)は放置しない — 欠落時に stderr へ1行の loud 警告を出すか、『state 欠落応答の fail-open/fail-closed』を仕様裁定の follow-up(Issue 起票)として record に固定することを条件とする。
- 留保(subagent-1, GoA2): state 欠落応答の fail-open 残余は仕様未規定のスキーマ異常クラス — 別 Issue で fail-open/fail-closed の仕様裁定を明示化することを条件に支持。
票タイムライン: 配信 2026-08-07T11:38:34Z → 配信 2026-08-07T11:38:34Z → subagent-2 2026-08-07T11:40:08Z → subagent-1 2026-08-07T11:40:15Z → 開票 2026-08-07T11:40:21Z
GoA[E-MPC-CGBLK]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
