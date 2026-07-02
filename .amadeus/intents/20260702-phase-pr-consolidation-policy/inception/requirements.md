# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | phase PR の統合を許可する条件と、許可しない場合の既定が Git Branching Policy から読める。 | 採用済み | なし | [R001-consolidation-conditions.md](requirements/R001-consolidation-conditions.md) |
| R002 | 統合単位は仕様側（Discovery〜Inception）と Construction 以降の 2 グループに限定され、branch 命名が定義されている。 | 採用済み | R001 | [R002-consolidation-boundary-and-naming.md](requirements/R002-consolidation-boundary-and-naming.md) |
| R003 | 統合 PR の説明に必要な記録項目が定義され、gate の判定は phase ごとに state で行われる。 | 採用済み | R001 | [R003-consolidated-pr-records.md](requirements/R003-consolidated-pr-records.md) |
| R004 | development.md の手順と粒度制約が、統合条件と矛盾なく読める。 | 採用済み | R001, R002, R003 | [R004-existing-documents-consistency.md](requirements/R004-existing-documents-consistency.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 統合条件と既定は他の要求に依存せず定義できるため。 |
| R002 | R001 | 統合単位と命名は、統合を許可する条件の適用範囲を定めるため。 |
| R003 | R001 | 記録項目は、統合が許可された PR に対する要求であるため。 |
| R004 | R001, R002, R003 | 整合確認は、確定した条件、単位、記録項目を既存文書と突き合わせるため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |

## Requirements Review Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| Ideation scope との対応 | passed | SC-IN-001 と SC-IN-002 を R001、SC-IN-001 の適用範囲を R002、SC-IN-003 を R003、SC-IN-004 を R004 に対応付けた。 |
| 対象外の維持 | passed | Construction 実装と finalization の統合、phase gate の廃止や自動化、大きい Intent への適用を要求に含めていない。 |
| 依存関係 | passed | 条件を独立に定義し、単位と記録がそれに従い、整合確認が最後に来る順に整理した。 |
| 検証可能性 | passed | 各要求は policy 文書の差分と既存文書との突き合わせから検証できる。 |

## 未確認事項

- なし。
