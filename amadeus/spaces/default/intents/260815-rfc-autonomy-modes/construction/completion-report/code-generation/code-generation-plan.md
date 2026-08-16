# Code Generation Plan — unit completion-report(C9 / ADR-3)

## 拘束

- R-1(ADR-3): 完了境界(`completeWorkflowForTarget`、state確定後・completion JSON出力前)でauto-decision要約レポートを機械生成する。
- R-2(ADR-3・P2): 入力はAUTO_DECIDED監査行と`listProductionAutoDecisions`の出力のみ。LLMによる計数・散文の混入を禁止する。
- R-3(ADR-3): レポート生成はnon-blocking — 生成失敗(record dir不在・APIエラー・書込失敗)はcompletion JSONへ警告として記録するのみで、`complete-workflow`自体を失敗させない。
- R-5(Q2): `listProductionAutoDecisions`はページングを持つため、`nextCursor`がnullになるまで全ページ走査してから集計を確定する(1ページ目のみでの打ち切りを禁止)。
- R-8: AUTO_DECIDED監査行数と`listProductionAutoDecisions`件数が不一致の場合、不一致をレポートへ明記する(片方を無音優先しない)。

## TDD 順序(実施順)

1. `4d2fc1873`: `listProductionAutoDecisions`へのページングcursor貫通(R-5の前提となる純粋追加、既存呼出し元への影響なし)を先行実装。
2. `013e5740f`: `buildAutoDecisionSummary(pd, recordDir)`を実装し、AUTO_DECIDED監査行と`listProductionAutoDecisions`の最終ページまでの走査から集計。`completeWorkflowForTarget`のstate書込とcompletion JSON出力の間に配線(R-4)。record dir解決不能・list APIエラー・markdown書込失敗のすべての失敗経路を`auto_decision_summary_warning`へ解決(R-3)、外側try/catchをbackstopに。
3. `cd7c7cb1a`: unit test(`renderAutoDecisionSummaryMarkdown`の逐語転記、`formatSummaryBuildError`の全SummaryBuildError kind網羅)とintegration test(実`IntentAutonomyRepository`経由でAUTO_DECIDED監査トランザクションを実際にseedし、complete-workflowをend-to-endで駆動して集計値をpin。non-blockingの2falling proof: AUTO_DECIDED行0件、summaryパス書込失敗の両方でworkflow完了は継続)。

## 検証・配送

- swarm batch 2(completion-report / waiting-interruption)。
- referee: `32fa26c43 integrate bolt-completion-report (batch 2)` で `swarm-int-rfc0001` へ収束。base `54baec9ce`(batch1統合断面)。
- worktree: `.amadeus/worktrees/bolt-completion-report`、branch `bolt-completion-report`、HEAD `cd7c7cb1a`。
