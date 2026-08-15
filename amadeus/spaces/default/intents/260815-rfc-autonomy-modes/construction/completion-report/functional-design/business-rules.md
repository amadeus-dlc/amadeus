# Business Rules — unit completion-report

- R-1(ADR-3): 完了境界(`completeWorkflowForTarget`、state 確定後・completion JSON 出力前)で auto-decision 要約レポートを機械生成すること。
- R-2(ADR-3・P2): 入力は AUTO_DECIDED 監査行と `listProductionAutoDecisions` の出力のみとし、LLM による計数・散文の混入を禁止する。件数はすべて disk/API から機械集計した値であること。
- R-3(ADR-3): レポート生成は non-blocking — 生成失敗(record dir 不在・API エラー・書込失敗のいずれも)は completion JSON へ警告として記録するのみで、`complete-workflow` 自体を失敗させない(`error()` を呼ばない)。
- R-4(Q1): 生成タイミングは `operationWriteState` 実行後・completion JSON `console.log` 実行前に限定する — state 未確定な断面からの集計、または出力後の非同期生成を禁止する。
- R-5(Q2): `listProductionAutoDecisions` はページングを持つため、`nextCursor` が null になるまで全ページ走査してから集計を確定すること — 1 ページ目のみでの打ち切りを禁止する。
- R-6(Q3): レポートは既存の `AutoDecisionRecord.basisKind` 列挙(confirmed-policy/norm/history/solo-election/agent-recommendation)で内訳を構成する。`RecommendationOutcome` 型(U1)を import・参照しない。
- R-7(Q4): 出力先は `<record>/completion/auto-decision-summary.md` に固定し、stage 所有ディレクトリ(`<record>/<phase>/<stage>/`)へは書かない。
- R-8: AUTO_DECIDED 監査行数と `listProductionAutoDecisions` の件数が一致しない場合、不一致をレポートへ明記する(片方の数値を無音で優先しない)。

## 落ちる実証(Red の期待)

- 現行: `completeWorkflowForTarget` の completion JSON(`amadeus-state.ts:3403-3412`)に auto-decision 要約に相当するフィールドが存在しない。AUTO_DECIDED が複数件ある record で `complete-workflow` を実行し、出力 JSON に集計値が現れないことを実測してから実装する(Red)。
- 導入後: 同じ record 断面で `auto_decision_summary` フィールドが AUTO_DECIDED 実測件数と一致することを pin する(Green)。
- non-blocking の実証: record dir 解決を意図的に失敗させる fixture で `complete-workflow` 自体が exit 0 のまま完了し、`auto_decision_summary_warning` のみが立つことを実測する。
