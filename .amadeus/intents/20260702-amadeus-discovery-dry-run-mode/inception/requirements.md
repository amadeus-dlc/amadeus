# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | `amadeus-discovery dry-run` を読み取り専用 mode として扱える。 | 採用済み | なし | [R001-dry-run-readonly-mode.md](requirements/R001-dry-run-readonly-mode.md) |
| R002 | `dry-run` が候補表示に必要な入力と出力を説明できる。 | 採用済み | R001 | [R002-dry-run-input-output.md](requirements/R002-dry-run-input-output.md) |
| R003 | `dry-run` の副作用禁止と `scaffold-only` との差分を説明できる。 | 採用済み | R001 | [R003-dry-run-side-effect-boundary.md](requirements/R003-dry-run-side-effect-boundary.md) |
| R004 | `dry-run` が過去分析と学習分類の結果を入力にできるが、それらの責務を所有しない。 | 採用済み | R002, R003 | [R004-history-learning-consumer-boundary.md](requirements/R004-history-learning-consumer-boundary.md) |
| R005 | source skill、昇格先成果物、eval または text contract の同期と検証を追跡できる。 | 採用済み | R001, R004 | [R005-skill-sync-verification.md](requirements/R005-skill-sync-verification.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 読み取り専用 mode の存在が最初の前提になるため。 |
| R002 | R001 | 入力と出力は、`dry-run` が mode として定義されてから扱えるため。 |
| R003 | R001 | 副作用禁止と `scaffold-only` との差分は、読み取り専用 mode の性質から導くため。 |
| R004 | R002, R003 | 過去分析と学習分類の結果利用は、入力と出力、および副作用禁止が定義されてから扱うため。 |
| R005 | R001, R004 | source skill と昇格先成果物の同期検証は、`dry-run` の責務と consumer 境界が定義されてから扱うため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 充足済み | [B001 test-results](../construction/bolts/B001-discovery-dry-run-mode-contract/test-results.md) |
| R002 | 充足済み | [B001 test-results](../construction/bolts/B001-discovery-dry-run-mode-contract/test-results.md) |
| R003 | 充足済み | [B001 test-results](../construction/bolts/B001-discovery-dry-run-mode-contract/test-results.md) |
| R004 | 充足済み | [B001 test-results](../construction/bolts/B001-discovery-dry-run-mode-contract/test-results.md) |
| R005 | 充足済み | [B002 test-results](../construction/bolts/B002-dry-run-sync-verification/test-results.md) |
