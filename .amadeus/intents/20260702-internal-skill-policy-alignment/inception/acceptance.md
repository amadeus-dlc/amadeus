# 受け入れ状態

## 要求状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 検証済み | [B001 test-results](../construction/bolts/B001-readme-internal-skill-catalog/test-results.md)、[B001 pr.md](../construction/bolts/B001-readme-internal-skill-catalog/pr.md) |
| R002 | 検証済み | [D001](../construction/decisions/D001-readme-skill-classification.md)、[B001 test-results](../construction/bolts/B001-readme-internal-skill-catalog/test-results.md)、[B001 pr.md](../construction/bolts/B001-readme-internal-skill-catalog/pr.md) |
| R003 | 検証済み | [B002 test-results](../construction/bolts/B002-implicit-invocation-policy/test-results.md)、[B002 pr.md](../construction/bolts/B002-implicit-invocation-policy/pr.md) |
| R004 | 検証済み | [B002 test-results](../construction/bolts/B002-implicit-invocation-policy/test-results.md)、[B002 pr.md](../construction/bolts/B002-implicit-invocation-policy/pr.md) |
| R005 | 検証済み | [D003](../construction/decisions/D003-follow-up-scope-separation.md)、[B003 test-results](../construction/bolts/B003-follow-up-and-verification/test-results.md)、[B003 pr.md](../construction/bolts/B003-follow-up-and-verification/pr.md) |

## 状態ルール

- Inception で作成した要求は `提案` または `採用済み` から始める。
- 実装証拠が登録されるまでは `充足済み` にしない。
- 検証証拠が登録されるまでは `検証済み` にしない。
- 証拠がない場合は `未登録` と書く。
- R001 から R005 の `検証済み` は、テスト結果と PR #287 の人間 merge を承認証拠とする（D004）。
