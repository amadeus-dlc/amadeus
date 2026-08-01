# Stakeholder Map — 260801-cg-plan-guard

上流入力(consumes 全数): なし(起点ステージ)

## ステークホルダー一覧

| ステークホルダー | 関心 | 関与 |
|---|---|---|
| ユーザー(j5ik2o) | 計画どおりの並行実行が守られること。誤発動で運用が止まらないこと | 要件骨子の裁定済み(Issue #1892)。ゲート承認・マージ承認・#1893 方向の最終裁定 |
| conductor(将来 intent の実行者) | ガード発動時に出口が分かること(3部メッセージ)。正当直列が誤発動しないこと | ガードメッセージの一次読者 — メッセージ契約の受益者 |
| builder / swarm | invoke-swarm directive が計画どおり発行されること | 間接(engine 出力の消費者) |
| engine(amadeus-orchestrate / amadeus-runtime) | tryEmitSwarm / firstUncoveredBatch / approve / computeBoltDag の契約変更 | 実装対象 |
| 過去 record(18 intent の調査 corpus) | 正当直列6件が緑・不履行4件が赤という実証データ源 | corpus sweep の入力(読み取りのみ、遡及変更なし) |
| レビュアー(§12a) | fail-closed の両側実証・検証劇場の不在 | 品質ゲート |

## 利害の衝突と調停

- **conductor の機動性 vs ガードの厳格性**: 逃し弁を「計画訂正のみ」に絞る裁定は機動性を意図的に削る側 — 3部メッセージ契約(公認の出口の名指し)が調停装置。誤発動の抑止は corpus sweep(正当直列6件で緑)が引き受ける。
- **過去 record の不可侵 vs 実証データ利用**: corpus は読み取り専用で使い、遡及変更・遡及検査はしない(スコープ境界)。
