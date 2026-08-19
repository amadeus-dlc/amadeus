# Formal Model Check — verdict(260809-report-done-kind-split)

上流入力: 直前の `tla-authoring` の適用性判定(`construction/tla-authoring/applicability-assessment.md`)。

## 判定: NOT_APPLICABLE(TLC は本ステージでは起動しない)

ステージ本文 Step 1 は「`impl-only` / `non-target` / `not-applicable` の outcome は `NOT_APPLICABLE` を記録し TLC を起動しない」と定める。直前の判定は終端 `non-target`(根拠は上流成果物の §3 — 語彙 probe が対照リテラルつきで全モデル 0 hit、namedInvariants に directive 発行語彙が不在、本 intent の実装差分 0 行、pinned implPath の drift 0)。したがって本ステージの outcome は `NOT_APPLICABLE`。

## 参考: 本 intent 内で別途実行した TLC 全数検査

本ステージの outcome とは別に、`build-and-test` の完了報告時に engine が `execute-advisory-handoff`(`formal-model-check` / `spec-change` / instance `159c5aeb-7108-40e5-bea0-6df31788a1dd`)で hold したため、**登録済み全4モデルの網羅探索を実際に実行した**。hold 理由は `never-run`(activation state が新規 worktree に不在)であり、記録だけで解消するのは検証劇場に当たるため実検査を選んだ。

| モデル | outcome | exit | runId | completion marker |
|---|---|---|---|---|
| BoltPrAttestationGate | NOT_DETECTED | 0 | `4add8861-bdc9-4e57-bd12-a2138a77a848` | `complete: true` |
| FormalElection | NOT_DETECTED | 0 | `1823b97f-3b8b-48d5-95e2-1d933ddefb26` | `complete: true` |
| MirrorLifecycle | NOT_DETECTED | 0 | `91db3093-8c69-4b8c-a456-1cb8d6f889e0` | `complete: true` |
| PrConvergenceGate | NOT_DETECTED | 0 | `2e25b689-1bd2-472d-919a-64e2b27642e5` | `complete: true` |

実行は `run-model-check.ts --model <tla> --cfg <cfg> --out <repo外 scratch>` の単一モデル経路(`cid:formal-model-check:c2`)。部分探索・timeout は fail-closed で HARNESS_ERROR になるため、4件の `complete: true` は固定点までの完走を意味する(`cid:application-design:finite-exploration-not-detected-proof`)。model-completeness センサーも `{"pass":true,"findings_count":0,"findings":[]}`。

`plugin-activation record .claude` はこの**実検査の後に**実行し、`advisory .claude` が `{"verdict":{"kind":"no-hold"}}` を返すことを実測して hold を解消した。本ステージの `NOT_APPLICABLE` 判定を理由に record を実行したのではない(`cid:formal-model-check:fmc-no-activation-record-on-not-applicable` に抵触しない)。詳細な実行記録は `construction/build-and-test/build-test-results.md` の形式検証節。
