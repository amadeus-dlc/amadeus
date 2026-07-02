# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | なし | R001 | なし | [UC001-generate-provenance-record.md](use-cases/UC001-generate-provenance-record.md) |
| UC002 | ACT002 Agent | EXT001 GitHub | なし | R002, R003 | UC001 | [UC002-detect-provenance-drift-in-ci.md](use-cases/UC002-detect-provenance-drift-in-ci.md) |
| UC003 | ACT001 Maintainer | なし | なし | R004, R005 | なし | [UC003-reference-record-method-and-boundary.md](use-cases/UC003-reference-record-method-and-boundary.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | provenance 記録の生成は他の相互作用に依存せず成立するため。 |
| UC002 | UC001 | 照合対象の JSON は UC001 の生成で作られるため。 |
| UC003 | なし | 記録方法と検査責務境界の参照は、この Intent の成果物（policies.md、development.md、decisions）を対象にし、UC001 の実行結果に依存しないため。 |
