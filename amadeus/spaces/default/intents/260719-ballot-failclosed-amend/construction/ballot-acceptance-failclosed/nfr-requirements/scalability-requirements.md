# Scalability Requirements — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

| # | 要求 | 導出元 |
| --- | --- | --- |
| SC-1 | ledger の ballot 数は voters 数+amend 数(voters に上限制約なし — model.ts:55 voters: string[] 実測。参考実測: leader store 全34選挙で最大3)— resolveBallots は amend が voter あたり複数でも線形走査で解決(上限制約を新設しない) | business-rules.md BR-4 |
| SC-2 | FR-2 の corpus sweep は選挙ディレクトリ数に線形 — glob 全数列挙(固定件数ループ禁止)で件数増に自動追従 | requirements.md FR-2(RA レビュー是正済み) |

## 非該当(N/A 根拠)

サービス・分散基盤なし(CLI ワンショット実行)— スループット・水平スケールの要求は対象実在なしにつき N/A(environment-provisioning:c3 の語彙)。
