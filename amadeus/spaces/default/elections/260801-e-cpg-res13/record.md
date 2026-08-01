# Election Record — E-CPG-RES13

- question: 260801-cg-plan-guard reverse-engineering の §13 学習選定。候補 c1(患部 verbatim 直読+関数不変実測による引用再解決免除)は E-OBB5-RES13 追補の適用実例、c2(RE センサー不適用の代替検証)は cid:reverse-engineering:re-sensors-codekb-filter-mismatch の実例 — いずれも新規規則を導かないため 0 件を提案。反対材料があれば record(RE diary・re-scans/260801-cg-plan-guard.md・timestamp)を実測して投票。

裁定: 0件(両候補とも既存 cid の実例扱い)(choice 1: 2票)
内訳: choice1=2票 choice2=0票
- 留保(subagent-1, GoA2): c1 が適用する追補 cid:reverse-engineering:c1-xrev-scan-mode(E-OBB5-RES13)は本日 2026-08-01 採用の新規則であり、実例2件目としての適用は妥当だが規則自体の耐久性は未検証。次回週次蒸留ラウンドで免除条件(observed 一致 SHA での検証済み)の運用実績を再確認する。
- 留保(subagent-2, GoA2): 0件に同意するが、記録面で2点。(1) re-scans/260801-cg-plan-guard.md の『本 intent の患部3ファイル(orchestrate/runtime/lib)は区間内で touch されたが患部関数は不変』は実測とずれる — git diff c49e385ac..cb809c4de -- <3ファイル> の --stat は lib.ts のみ +202 で、orchestrate.ts と runtime.ts は区間内 diff 0(=touch されていない)。結論(患部関数不変)はより強い形で成立するため裁定に影響しないが、後続が『touch あり+関数不変』を免除の先例として引く余地を残すので、記録は『orchestrate/runtime は区間内無変更、lib は touch あり(writer 抽出)だが parseUnitsBlock 本体は不変』へ訂正するのが正確。(2) RE diary の『E-OBB5-RES13 追補の免除条件を関数不変の実測で充足』という表現は、追補が定める免除条件(当該引用が observed と一致する SHA で検証済みであること)そのものではなく、関数不変という別根拠を免除条件へ持ち込むように読める。実態は re-scans が『ガード患部の確定(observed cb809c4de)』として observed で verbatim 直読しており、これは免除の適用ではなく再解決の実施に当たる。追補が明示的に禁じた『区間 touch の有無のみを根拠とした一般免除』への拡大解釈を招かないよう、diary の表現は『observed で再解決済み(関数不変は補助証拠)』へ寄せることが望ましい。いずれも既存 cid の運用精度の問題であり、新規ノルムを要しない。
票タイムライン: 配信 2026-08-01T08:01:12Z → 配信 2026-08-01T08:01:12Z → subagent-1 2026-08-01T08:40:00Z(受理 2026-08-01T08:02:19Z) → subagent-2 2026-08-01T08:40:00Z(受理 2026-08-01T08:03:14Z) → 開票 2026-08-01T08:03:42Z
GoA[E-CPG-RES13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
