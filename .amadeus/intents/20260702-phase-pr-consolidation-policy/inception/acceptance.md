# 受け入れ状態

## 要求状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 検証済み | [test-results](../construction/bolts/B001-policy-consolidation-rules/test-results.md)、[pr.md](../construction/bolts/B001-policy-consolidation-rules/pr.md) |
| R002 | 検証済み | [test-results](../construction/bolts/B001-policy-consolidation-rules/test-results.md)、[pr.md](../construction/bolts/B001-policy-consolidation-rules/pr.md) |
| R003 | 検証済み | [test-results](../construction/bolts/B001-policy-consolidation-rules/test-results.md)、[pr.md](../construction/bolts/B001-policy-consolidation-rules/pr.md) |
| R004 | 検証済み | [test-results](../construction/bolts/B002-development-doc-alignment/test-results.md)、[pr.md](../construction/bolts/B002-development-doc-alignment/pr.md) |

## 状態ルール

- `提案` は要求案が記録された状態である。
- `採用済み` は Inception で扱う要求として合意された状態である。
- `充足済み` は実装証拠が登録された状態である。
- `検証済み` は人間承認を含む確認が済んだ状態である。R001 から R004 は、テスト結果と PR #332 の人間 merge を承認証拠とする（D003）。
