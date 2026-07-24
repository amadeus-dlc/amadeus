# Stakeholder Map — 260724-harness-provenance

上流入力(consumes 全数): なし(intent-capture は consumes を宣言しないステージ)

## Key Stakeholders and Their Interests

| Stakeholder | 役割 | 関心事 |
|---|---|---|
| ユーザー(j5ik2o) | プロダクトオーナー/意思決定者 | Issue #1452 を自ら起票・指示。障害調査時にハーネス種別を即座に特定できることを求める |
| leader(agmsg team amadeus) | ディスパッチ元、ゲート実行者 | intent の進行管理、常任グラント(504d1102)の有効期限内でのゲート承認、着手・完了・ブロッカー報告の受領 |
| Amadeus 開発チーム(e2-e6 等の並行 builder) | 実装消費者 | 複数ハーネスを使い分ける開発フローの中で、自分がどのハーネスで作業しているかが記録に残ることの恩恵を受ける。既存の per-unit ループ・swarm 実装フローへの影響が最小限であることを求める |
| §13 学習・postmortem 運用の担当(leader/全メンバー) | ノルム保守 | ハーネス種別が構造化フィールド化されることで、「どのハーネスがバグを生みやすいか」等の分析材料が機械的に得られる可能性 |

## Decision-Makers vs. Influencers

- **意思決定者**: ユーザー(仕様変更・スコープ確定の最終承認)、leader(常任グラント範囲内でのステージゲート承認執行)
- **影響者**: 実装を行う builder(e5 = 本 intent の conductor)、レビュアー(reviewer 実装済みのスポットチェック契約)

## Communication Requirements

- 着手・完了・ブロッカーは leader へ都度報告(cid:requirements-analysis:push-reporting)
- 要件・設計は通常のゲート(自動承認、常任グラント 504d1102 が有効期限内なら適用可)を経て進行
- 仕様変更に相当する判断が生じた場合は正準リスト(4)に従いユーザーへエスカレーション
