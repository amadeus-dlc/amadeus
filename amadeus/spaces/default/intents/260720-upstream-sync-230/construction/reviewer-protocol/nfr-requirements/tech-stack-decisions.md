# Tech Stack Decisions — reviewer-protocol

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。U08は既存reviewer invocationと配布choke pointの是正であり、新技術の導入を行わない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime | Bun 1.3.13 | TypeScript protocol、tools、tests、packagingの既存runtimeを維持する。 |
| Language | TypeScript ESM | `reviewerReadScope`と`runtimeReviewIdentity`の正準型境界を既存codebaseへ実装できる。 |
| UTC source | shell `date -u +%Y-%m-%dT%H:%M:%SZ` | 実行時事実を記録し、モデル推定や固定fixture値を排除する。 |
| Review execution | 既存reviewer subagent | maker-checker identityと独立review境界を維持する。 |
| Provenance | 既存Review/subagent/audit records | 新eventなしでscope decisionを追跡する。 |
| Packaging | `scripts/package.ts`による6 harness projection | authored sourceを正本にし、dist手編集を防ぐ。 |
| Self-install | 既存4面closed list | package面との混同や対象拡張を防ぐ。 |
| Testing | `bun:test`、既存unit/integration/e2e runner | pure predicate、filesystem scope、subagent recordをintegration-firstで検証する。 |

公開seamは`reviewerReadScope(unit, consumes)`と`runtimeReviewIdentity(persona, utcDate)`の正準2関数だけに限定し、pass-list builder、owner resolver、decision recorder、date command runnerは内部helperとする。

## 追加しない技術

- 新runtime dependency、network client、database、service、UI、daemon、cache、queue。
- filesystem indexer、recursive search engine、glob-based owner discovery。
- 新audit event、別provenance store、独自retention/alerting基盤。
- 追加public API、permission bypass、identity fallback、timestamp推定。

## Source・test ownership

authored coreのreviewer personas、reviewing knowledge、stage protocolと、独立authoringのorchestrator skillを更新し、generatorで6 harnessへ投影する。`dist/`とself-install treeは生成物であり手編集しない。

pureな4条件predicateとidentity validationはunit、real path/pass-list/subagent/audit/projectionはintegration、配布journeyは必要最小e2eへ置く。push前local lcovでpatch追加行未カバー0を確認し、spawn blind spotは実測後に計測済みmoduleへのin-process seamで覆う。waiverは既決条件の明示証拠がある残余行だけに限定する。

## Decision consequences

既存stack維持により新しいsecurity/operations surfaceを増やさず、reviewのscopeとprovenanceを決定的にできる。一方、owner contractが曖昧なintegrationは追加readで補えずfindingとして戻る。これは既決fail-closed policyであり、本Unitでpermissionを広げない。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U08-01〜17、`business-logic-model.md`のPublic seam/ownershipとProjection flow、`requirements.md`のFR-5、NFR-3〜8、`technology-stack.md`の現行runtime・language・test・distribution構成に対応する。
