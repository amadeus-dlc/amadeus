# 受け入れ

## 要求状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 検証済み | [B001 test-results](../construction/bolts/B001-decision-review-stage-prerequisite-evidence/test-results.md), [B002 test-results](../construction/bolts/B002-skill-contract-prerequisite-alignment/test-results.md) |
| R002 | 検証済み | [B001 test-results](../construction/bolts/B001-decision-review-stage-prerequisite-evidence/test-results.md), [B002 test-results](../construction/bolts/B002-skill-contract-prerequisite-alignment/test-results.md) |
| R003 | 検証済み | [B001 test-results](../construction/bolts/B001-decision-review-stage-prerequisite-evidence/test-results.md), [B002 test-results](../construction/bolts/B002-skill-contract-prerequisite-alignment/test-results.md) |
| R004 | 検証済み | [B003 test-results](../construction/bolts/B003-failure-routing-and-example-boundary/test-results.md) |
| R005 | 検証済み | [B003 test-results](../construction/bolts/B003-failure-routing-and-example-boundary/test-results.md) |

## 状態ルール

| 状態 | 意味 | 遷移条件 |
|---|---|---|
| 提案 | 要求候補として記録した状態。 | Inception の要求レビュー前。 |
| 採用済み | Inception の対象要求として採用した状態。 | Requirements Review Gate を通過した場合。 |
| 充足済み | Construction の成果物または実装で要求を満たした状態。 | 対応 Bolt の完了条件と証拠がそろった場合。 |
| 検証済み | 検証結果で要求の充足を確認した状態。 | validator、eval、テスト、レビュー証拠がそろった場合。 |

Inception では実装証拠がないため、要求状態は `採用済み` までに留める。
