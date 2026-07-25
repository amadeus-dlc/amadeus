# NFR Requirements Questions — mirror-contract-policy

## 判定

`business-logic-model.md`と`business-rules.md`は、設定層数、純粋関数境界、mode／operation／boundary集合、event identity、completion chainを反証可能な契約として確定している。`requirements.md`はNFR-1〜5と明確なスコープ外を定義し、`technology-stack.md`は既存のTypeScript／Bun／Node.js APIだけを使う制約を示している。追加の製品判断は不要である。

## 確定済み回答

### Q1. 常駐serviceのlatency／availability SLOを置くか

[Answer]: 置かない。本Unitはlifecycle boundaryまたは明示CLIで呼ばれるローカル処理であり、service SLIが存在しない。代わりに、pure policyの外部I/O 0件、config collectorのread対象最大3層、completion chainのremote operation最大3件を機械検証する。

### Q2. security／complianceの境界はどこか

[Answer]: C1は設定fileのread-only access、C2はvalidated valueだけを扱うpure functionとする。credential、token、Issue本文を入力・state・audit・diagnosticへ保存しない。本UnitはPII、PHI、cardholder dataを新規処理しないため、GDPR／HIPAA／PCI-DSS固有controlは非適用とし、repositoryの既存security／retention policyを変更しない。

### Q3. reliabilityを何で検証するか

[Answer]: 同一入力のdeep-equal出力、invalid configのfail-closed、event keyのbyte安定性、同一completion instance内だけのreceipt選択、prepared／attempted／pendingから同一operationへの収束をunit／property testで検証する。GitHub障害時の非阻害と重複防止は後続Gateway／Lifecycle Unitが所有する。

## 曖昧性分析

- 「高速」「高可用」のような未測定表現を要件へ採用していない。
- 単発処理のtimeoutをservice SLOへ昇格していない。
- C2のpure contractとC6のGitHub安全guardを分離し、本Unitへremote reliabilityを重複所有させていない。
- compliance非適用はデータ分類と外部I/O境界を根拠にしており、一般的なsecure coding要件を免除しない。
