# Performance Requirements — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

| # | 要求 | 導出元(強制メカニズム — nfr-requirements:c3) |
| --- | --- | --- |
| P-1 | 受理検証(SUBMITTED_AT_RE+Date 二段、BR-2)は ballot 1件あたり定数時間 — regex は非バックトラック形(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` は固定長数量子のみで nested quantifier・選択肢を含まず、構造的に入力長線形。domain-entities.md の定義から直接論証) | business-rules.md BR-2。ReDoS 線形性の専用実測義務は現行ノルムに存在しない(補足の出典分離: regex 性能実測の §13 候補は他 intent の選挙 E-GMEBT で公式裁定=不採用 — git 検証可能面は Issue #1261 本文の「ユーザー裁定で不採用(choice 多数 2-1)を正式裁定」記載+leader worktree elections/E-GMEBT/record.md の leader 注記。store tally.json の adopted 表示は #1261 の既知バグ産物であり裁定ではない) |
| P-2 | resolveBallots(BR-4)は O(n)(n = ballot 件数。上限制約は Election 型に存在しない — model.ts:55 voters: string[] 実測。参考実測: leader store 全34選挙の voters 配列長は最大3)— 性能テストは新設しない | business-logic-model.md 関数配置。専用性能 NFR は承認 NFR 不在につき N/A(build-and-test:c1 — 戦略名だけで検査を機械追加しない) |

## 検証方法

既存 --ci スイートの実行時間逸脱がないこと(専用ベンチ不要 — technology-stack.md の bun:test 自作 runner 構成に追加基盤を持ち込まない)。
