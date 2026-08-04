# Team Allocation — live E2E Phase 2

## 入力とチーム前提

割当は [requirements.md](../requirements-analysis/requirements.md)、[components.md](../application-design/components.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md) と [bolt-plan.md](./bolt-plan.md) に基づく。

Team Formationは本IntentでSKIPされているため、全Boltの実装主体は`amadeus-developer-agent`とする。設計、品質、セキュリティ、レビューの責務はConstruction stageのlead/support/reviewerへ渡し、ここで新しい恒久チームを発明しない。

## Bolt assignment

| Bolt | Owner | Design/support | Verification | Human responsibility |
|---:|---|---|---|---|
| 1 Kiro TUI | `amadeus-developer-agent` | architect / quality / devsecops | contract、integration、opt-in live、cleanup | local auth利用の許可、Walking Skeleton gate、PR merge |
| 2 Kiro ACP | `amadeus-developer-agent` | architect / quality / devsecops | JSON-RPC contract、integration、opt-in live、descendant reap | local auth利用の許可、必要時follow-up Issue確認、PR merge |
| 3 Kimi Print | `amadeus-developer-agent` | architect / quality / devsecops | adapter contract、integration、opt-in live、credential isolation | local auth利用の許可、PR merge |
| 4 Evidence | `amadeus-developer-agent` | architect / quality | matrix/ledger、回帰、build/source-only | Phase 2証跡とPR mergeの承認 |

## Ownership boundaries

- Builderは割当worktree内だけで編集・git操作し、既存common kernel契約を無断で緩和しない。
- Architectはdirect/follow-up分岐、retryable error分類、実行失敗＋cleanup失敗のprimary/secondary outcomeをFunctional/NFR Designで固定する。
- QualityはfakeによるRed、contract/integration、既存Codex・Claude・Pi回帰、対象live receiptを検収する。
- DevSecOpsはallowlisted environment、source auth/config path非露出、scratch/credential cleanupを検収する。
- 人間だけが実credentialを使うlocal live、GitHub Issueの公開、PR mergeを承認する。secret値やsource pathを成果物へ記録しない。

## Capacity and handoff

- 同時active builderは最大4というteam既定内だが、本計画は共有file contentionのため直列開始とする。
- Boltごとに成果物、test、receiptまたはIssue link、変更file目録を次Boltへ引き渡す。
- 先行Boltが共通fileを正準化して後続の編集交差を消した場合だけ、残りBoltの並行化をDAG更新・再compileを含む再裁定として評価する。
