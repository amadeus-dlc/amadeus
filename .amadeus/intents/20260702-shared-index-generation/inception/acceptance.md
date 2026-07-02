# 受け入れ状態

## 要求状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 検証済み | [B001 test-results](../construction/bolts/B001-regeneration-script-and-verification/test-results.md)、[B004 test-results](../construction/bolts/B004-workspace-and-examples-migration/test-results.md)、[pr.md](../construction/bolts/B001-regeneration-script-and-verification/pr.md) |
| R002 | 検証済み | [B001 test-results](../construction/bolts/B001-regeneration-script-and-verification/test-results.md)、[B004 test-results](../construction/bolts/B004-workspace-and-examples-migration/test-results.md)、[pr.md](../construction/bolts/B001-regeneration-script-and-verification/pr.md) |
| R003 | 検証済み | [B001 test-results](../construction/bolts/B001-regeneration-script-and-verification/test-results.md)、[pr.md](../construction/bolts/B001-regeneration-script-and-verification/pr.md) |
| R004 | 検証済み | [B002 test-results](../construction/bolts/B002-validator-consistency-checks/test-results.md)、[pr.md](../construction/bolts/B002-validator-consistency-checks/pr.md) |
| R005 | 検証済み | [B001 test-results](../construction/bolts/B001-regeneration-script-and-verification/test-results.md)、[B003 test-results](../construction/bolts/B003-skill-procedures-and-templates/test-results.md)、[pr.md](../construction/bolts/B003-skill-procedures-and-templates/pr.md) |
| R006 | 検証済み | [B004 test-results](../construction/bolts/B004-workspace-and-examples-migration/test-results.md)、[pr.md](../construction/bolts/B004-workspace-and-examples-migration/pr.md) |
| R007 | 検証済み | [B001 test-results](../construction/bolts/B001-regeneration-script-and-verification/test-results.md)、[B002 test-results](../construction/bolts/B002-validator-consistency-checks/test-results.md)、[pr.md](../construction/bolts/B001-regeneration-script-and-verification/pr.md) |

## 状態ルール

- `提案` は要求案が記録された状態である。
- `採用済み` は Inception で扱う要求として合意された状態である。
- `充足済み` は実装証拠が登録された状態である。
- `検証済み` は人間承認を含む確認が済んだ状態である。R001 から R007 は、テスト結果と PR #348 の人間 merge を承認証拠とする（D006）。
