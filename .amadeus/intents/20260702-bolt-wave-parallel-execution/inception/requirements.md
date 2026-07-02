# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | bolts の依存グラフから wave を導出する契約が Construction skill から読める。 | 採用済み | なし | [R001-wave-derivation-contract.md](requirements/R001-wave-derivation-contract.md) |
| R002 | wave 単位の並行実行、統合、検証の手順が Construction skill から読める。 | 採用済み | R001 | [R002-wave-execution-procedure.md](requirements/R002-wave-execution-procedure.md) |
| R003 | wave 内の複数 Bolt の Task Generation をまとめて承認する運用が Construction skill から読める。 | 採用済み | R001 | [R003-wave-batch-approval.md](requirements/R003-wave-batch-approval.md) |
| R004 | wave を使わない場合の従来どおりの直列実行が維持され、既存契約と矛盾しない。 | 採用済み | R001, R002, R003 | [R004-serial-execution-compatibility.md](requirements/R004-serial-execution-compatibility.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | wave の導出は bolts.md の既存の依存表だけを前提に定義できるため。 |
| R002 | R001 | 実行と統合の手順は、wave が導出されていることが前提になるため。 |
| R003 | R001 | まとめ承認は、wave 単位で準備が揃うことが前提になるため。 |
| R004 | R001, R002, R003 | 直列実行との整合は、wave 契約の全体が確定した後に確認できるため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
