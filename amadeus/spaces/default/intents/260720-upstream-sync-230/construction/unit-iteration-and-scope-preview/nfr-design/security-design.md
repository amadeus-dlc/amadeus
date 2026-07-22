# Security Design — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Input integrity

WorkflowState、StageGraph、ScopeName、CompiledGridは既存validationを通過したdecision inputとして扱う。`unit-major`は明示state verbだけで有効化し、field未指定をimplicit opt-inへ変換しない。不正iterationはstate、plan、runtime graph、auditの最初のmutation前に既存typed failureで拒否する。

新しいinvalid分類、error文言、exit policy、failure semanticsは本Unitで定義しない。Unit kind、scope、stage eligibility、coverageは既存graph判定を再利用する。

## Projection integrity

stage数とgate数は同一CompiledGridの同一effective in-scope集合から導出する。4 consumerは同じScopeSummary valueを使い、表示時にcountを差し替えない。human projectorは同値を表示し、JSON projectorは既存field/value/orderを保ったadditive `summary`だけを出す。

2 public seamはlock、state write、audit emit、workspace I/Oを所有しない。mutationは既存intent lock/audit transaction内に残す。新credential、network、database、service、UI、audit event、retention、permissionは追加しない。

## Control fixtures

| Threat | Control |
|---|---|
| implicit unit-major | 未指定時はstage-majorへ委譲 |
| invalid iteration | 全mutation前reject、4面bytes不変 |
| hardcoded count | CompiledGrid由来だけを許可 |
| projector drift | 共通ScopeSummary valueを投影 |
| JSON破壊変更 | additive summaryだけ |

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U05-01〜04を中心に、`performance-requirements.md`のpure decision、`scalability-requirements.md`の共通summary、`reliability-requirements.md`のmutation safety、`tech-stack-decisions.md`の既存transaction、`business-logic-model.md`のCompatibility/Integration boundariesへ対応する。
