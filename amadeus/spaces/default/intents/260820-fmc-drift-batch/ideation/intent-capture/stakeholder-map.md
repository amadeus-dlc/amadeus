# Stakeholder Map — 260820-fmc-drift-batch

## Key Stakeholders

| ステークホルダー | 関心 | 役割 |
|---|---|---|
| 監督ユーザー(このワークスペースの所有者) | 形式検証の実効性回復、tla モデルが増えない問題の解消、並列実装による速度 | 意思決定者 — 正準リスト事項(マージ、仕様変更、選挙同数)の裁定者。full grant 付与済み(禁止効果は常に人間へ) |
| conductor(AI、本セッション) | 4 unit の閉ループ実装を engine 契約・ノルムに沿って完遂 | 実行者 — ステージ運転、unit 分割、レビュー統括、ゲート裁定(grant 範囲内) |
| formal-model-check plugin(コード所有面) | validator/loader/sensor の3面境界の一貫性、登録 lifecycle の健全性 | 影響を受けるコンポーネント — #2289/#2929/#3187 の変更先 |
| github-pr-convergence plugin | 自プラグイン実装が governed entry になり drift 検知対象化 | 受益コンポーネント — PrConvergenceGate/BoltPrAttestationGate の pin 対象 |
| 将来の intent 実行者(AI/人間) | 適用性判定が drift・欠陥再発で revise-model を強制し、改訂が commit できること | 受益者 |
| CI / ブロッキングゲート群 | coverage ratchet・patch coverage・registry freshness・model-map ハッシュピンの resync | 制約 — 4台帳クラス(bt-ledger-resync 系)の同一変更 resync が必要 |

## Decision-makers vs Influencers

- **Decision-maker**: 監督ユーザー(不可逆・外部境界・仕様変更・選挙同数)。full grant により stage-gate / phase-gate / walking-skeleton / question は engine 梯子が自動裁定(AUTO_DECIDED、unreviewed queue に記録)
- **Influencers**: クロスレビュー4名の refinement(完了条件の3面化、t448 再スコープ等)— requirements-analysis の入力として拘束力を持つ。§13 学習・既存ノルム(project.md / team.md)は admission check 経由で判定を拘束

## Communication Requirements

- Issue / PR は日本語(識別子・ログ引用は原文保持)、コミットは英語
- 各 Bolt は PR 単位でスカッシュマージ、record checkpoint 同梱可(自 intent のみ)
- mirror Issue #3315 が record → GitHub の一方向同期で進捗を共有
- マージは常任承認(必須 CI green ∧ converged 実測時のみ)の範囲で実行、それ以外は都度ユーザーへ
