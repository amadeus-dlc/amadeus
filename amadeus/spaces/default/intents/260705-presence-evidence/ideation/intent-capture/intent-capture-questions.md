# Intent Capture 質問（260705-presence-evidence）

対象 Issue: [#506](https://github.com/amadeus-dlc/amadeus/issues/506)

Issue #506 に背景・実施候補・論点・受け入れ条件が記録済みである。回答は Issue とディスパッチ定型文から転記し、新規のピア協議は行わない。

---

## Q1. 中心の課題はどれですか？

A. docs-only 宣言の evidence が人間由来であることの機械的証明が現行検査に含まれず、自動化された呼び出し元による evidence 自作でガードを弱め得ること
B. declare-docs-only の使い勝手
C. audit の改ざん耐性
X. Other (please specify)

[Answer]: A（出典: Issue #506 背景 = PR #505 Bugbot 指摘）

## Q2. 成功の形はどれですか？

A. presence 相関の要否が論点 3 件の検討を経て判断され、採用時は eval 先行実装・不採用時は設計境界の文書化がされている（どちらの結論でも完了）
B. 候補 1 の実装が必須
C. 文書化のみが必須
X. Other (please specify)

[Answer]: A（出典: Issue #506 受け入れ条件とディスパッチ承認要旨。候補の採否は契約級として人間個別確認 = auto 例外）
