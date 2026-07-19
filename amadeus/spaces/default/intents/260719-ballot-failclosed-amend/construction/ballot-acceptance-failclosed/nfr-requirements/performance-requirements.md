# Performance Requirements — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

| # | 要求 | 導出元(強制メカニズム — nfr-requirements:c3) |
| --- | --- | --- |
| P-1 | 受理検証(SUBMITTED_AT_RE+Date 二段、BR-2)は ballot 1件あたり定数時間 — regex は非バックトラック形(固定長フィールドの逐次一致で nested quantifier なし) | business-rules.md BR-2。ReDoS 線形性の専用実測は E-GMEBT 裁定(不採用 — nested quantifier 形限定の範囲限定なら価値)に従い、本 regex は nested quantifier を含まないため対象外 |
| P-2 | resolveBallots(BR-4)は O(n)(voter 数 ≤ election.voters 長、実運用 ≤6)— 性能テストは新設しない | business-logic-model.md 関数配置。専用性能 NFR は承認 NFR 不在につき N/A(build-and-test:c1 — 戦略名だけで検査を機械追加しない) |

## 検証方法

既存 --ci スイートの実行時間逸脱がないこと(専用ベンチ不要 — technology-stack.md の bun:test 自作 runner 構成に追加基盤を持ち込まない)。
