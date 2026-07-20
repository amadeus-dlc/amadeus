# Risk and Sequencing Rationale — upstream-sync-230

> 上流入力(consumes 全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。`stories.md` / `mockups.md` は本 scope で SKIP 済み。

## 採用heuristic

E-USSDP2Rは **risk-first / 12 one-Unit Bolts / DAG内最大4並行 / WSJFなし** を2-1で採用した。user/business value、time criticality、job-sizeを同尺度で採点できる市場入力がないため、数値を捏造してWSJFを使わない。代わりに「新規architecture seam」「silent failureの影響範囲」「依存先数」「配布面数」をrisk順の根拠にする。

## 初期5-Bolt列の理由

1. U01はplugin/stage contractの単一正本で、U09/U10の誤解釈riskを先に閉じる。
2. U02はU10が要求するruntime graph self-healの必須前提。U09とはtopologically並行可能だが、E-USSDP1R採用列ではevidenceを段階的に固定するため先に独立完了させる。
3. U09は6 harness/4 self-installの所有境界を先に証明し、composeが未検証bundleを消費するriskを除く。
4. U10は最大の新規機構で、no-clobber/atomic failureをreference内容から独立に検証する。
5. U11で実際のreference pluginとguideを通し、source→projection→compose→doctor→dropのend-to-endを閉じる。

この5-Bolt列はWalking Skeletonの**限定例外**であり、`team-practices.md`の単一最初Bolt規定を一般変更しない。e2留保どおりU01/U09/U10/U11の独立review/rollback/verificationを守り、U11 e2e closureを必須とする。

## 残Unitのrisk grouping

| Risk tier | Units | 根拠 |
|---|---|---|
| High | U07, U03, U04 | 6 harness起動不能、swarm false convergence、guard bypassはsilent/広範囲 failure |
| Medium | U05, U06, U08 | opt-in/default互換、誤workspace分類、review品質は重要だが既存経路の直接破壊範囲が限定 |
| Closure | U12 | 全証拠に依存し、先行するとverification theaterになるため最後のみ |

High/Mediumは依存DAGが許す範囲でWave 2/3へ配置し、最大4並行でfeedbackを早める。file overlap実測でconflictが出た場合は直列化するが、economic groupingをbundleへ変えない。

## 主要riskとmitigation

| Risk | Likelihood / Impact | Mitigation / stop condition |
|---|---|---|
| shared schema drift | Medium / Critical | U01単一定義、consumer matrix、unknown fail-closed |
| plugin partial apply/clobber | Medium / Critical | U10 temp transaction、failure時bytes/record/audit不変 |
| 6/4 distribution混同 | Medium / High | U09独立matrix、generator-only ownership |
| progressive skeletonが長期化 | Medium / High | 各Bolt独立PR、Bolt 5 closure gate、少数案Xを再裁定材料に温存 |
| parallel branch conflict | Medium / Medium | max4、実diff overlap時はwave内直列化、canonical owner優先 |
| EQUIVALENT項目の不要改変 | Medium / High | characterization first、同等ならimplementation diff 0 |
| full gateを最後まで遅延 | Low / High | 各Bolt targeted test/coverage、U12でfull gate集約 |

## Alternatives and minority record

- E-USSDP1R e3少数案X/GoA2: 最初のBoltにU01+U02+U09+U10+U11の最小e2e slice後、各Unit完全化。単一Bolte2eには強いがUnit重複とrollback境界の曖昧化を伴うため非採用。
- E-USSDP2R e3少数案X/GoA2: record記載どおり温存。採用案のrisk前提が反証された場合に再提示する。
- 旧E-USSDP1/2は誤前提で無効・開票禁止。比較材料にも使わない。
