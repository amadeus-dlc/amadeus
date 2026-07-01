# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent, ACT001 Maintainer | なし | S001 | R001, R002 | なし | [UC001-maintain-skill-contract-catalog.md](use-cases/UC001-maintain-skill-contract-catalog.md) |
| UC002 | ACT002 Agent | EXT001 CI | S001 | R003, R004 | UC001 | [UC002-generate-and-check-skill-contracts.md](use-cases/UC002-generate-and-check-skill-contracts.md) |
| UC003 | ACT003 Validator, ACT004 Evaluator, ACT002 Agent | なし | S001 | R005 | UC002 | [UC003-consume-skill-contracts.md](use-cases/UC003-consume-skill-contracts.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | catalog 定義がすべての前提であるため。 |
| UC002 | UC001 | 生成とずれ検出は catalog の内容を入力にするため。 |
| UC003 | UC002 | consumer は生成済みの契約を参照するため。 |

## 未確認事項

- なし。
