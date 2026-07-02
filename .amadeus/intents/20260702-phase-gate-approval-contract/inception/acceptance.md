# 受け入れ状態

## 要求状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 検証済み | [B001 test-results](../construction/bolts/B001-implementation-gate-contract/test-results.md)、[B001 pr.md](../construction/bolts/B001-implementation-gate-contract/pr.md) |
| R002 | 検証済み | [B002 test-results](../construction/bolts/B002-trigger-and-scaffold-contract/test-results.md)、[B002 pr.md](../construction/bolts/B002-trigger-and-scaffold-contract/pr.md) |
| R003 | 検証済み | [B002 test-results](../construction/bolts/B002-trigger-and-scaffold-contract/test-results.md)、[B002 pr.md](../construction/bolts/B002-trigger-and-scaffold-contract/pr.md) |
| R004 | 検証済み | [B003 test-results](../construction/bolts/B003-approval-evidence-check/test-results.md)、[B003 pr.md](../construction/bolts/B003-approval-evidence-check/pr.md) |
| R005 | 検証済み | [B001 test-results](../construction/bolts/B001-implementation-gate-contract/test-results.md)、[B002 test-results](../construction/bolts/B002-trigger-and-scaffold-contract/test-results.md)、[B003 test-results](../construction/bolts/B003-approval-evidence-check/test-results.md)、[B001 pr.md](../construction/bolts/B001-implementation-gate-contract/pr.md)、[B002 pr.md](../construction/bolts/B002-trigger-and-scaffold-contract/pr.md)、[B003 pr.md](../construction/bolts/B003-approval-evidence-check/pr.md) |

## 状態ルール

- `提案` は要求案が記録された状態である。
- `採用済み` は Inception で扱う要求として合意された状態である。
- `充足済み` は実装証拠が登録された状態である。
- `検証済み` は人間承認を含む確認が済んだ状態である。R001 から R005 は、テスト結果と PR #322 の人間 merge を承認証拠とする（D003）。
