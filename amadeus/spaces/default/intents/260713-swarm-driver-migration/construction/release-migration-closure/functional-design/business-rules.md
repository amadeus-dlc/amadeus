# Release & Migration Closure Business Rules

## 上流トレーサビリティ

本成果物は`unit-of-work.md`のU-06、`unit-of-work-story-map.md`のREL-01/REL-02、`requirements.md`のFR-22〜FR-26、NFR-06、NFR-08〜NFR-09、NFR-11〜NFR-12、`components.md`のC-04/C-12、`component-methods.md`のregistration/legacy contract、`services.md`のrelease platform境界を規則へ変換する。

rule groupはすべてall-match accumulateである。1件でも違反すればrelease closureは`blocked`となり、優先順位で違反を隠さない。

## Registry completeness

| ID | ルール | 違反時 |
|---|---|---|
| RMR-01 | production registryは実composition rootをbuildして検査し、source regexだけを成功根拠にしない | `REGISTRY_INCOMPLETE` |
| RMR-02 | provider集合はClaude/Codex/Kiroの3件、native driver集合は公開4 driverとexact一致する | `REGISTRY_INCOMPLETE` |
| RMR-03 | `DriverAdapterSet` cardinalityはClaude=2、Codex=1、Kiro=1である | `REGISTRY_INCOMPLETE` |
| RMR-04 | map key、declared driver、`adapter.driver`、provider ownershipを全件一致させる | `REGISTRY_INCOMPLETE` |
| RMR-05 | `unavailable` slot、`REGISTRATION_SLOT_UNIMPLEMENTED`、fake/no-op adapterをproductionで0件にする | `REGISTRY_INCOMPLETE` |
| RMR-06 | dynamic load、unknown/extra descriptor、runtime driver mutationを禁止する | architecture failure |
| RMR-07 | U-03のdriver-keyed set correctionをU-01/U-02 Code Generationへ適用し、provider mapping/literalを変更しない | contract drift |

## Distribution projection

| ID | ルール | 違反時 |
|---|---|---|
| RMR-08 | authored sourceは`packages/framework/core`と4 harness directoryだけで、generated targetを正本として編集しない | `PROJECTION_DRIFT` |
| RMR-09 | packagerがdiscoverするmanifest集合はClaude/Codex/Kiro/Kiro IDEの4件とexact一致する | `PROJECTION_DRIFT` |
| RMR-10 | `dist/{claude,codex,kiro,kiro-ide}`は`package.ts --check`でbyte parity、orphan/unreferenced file 0件を満たす | `PROJECTION_DRIFT` |
| RMR-11 | `.claude`、`.codex`、`.agents`、`CLAUDE.md`、`AGENTS.md`は`promote-self.ts --check`でdrift 0にする | `PROJECTION_DRIFT` |
| RMR-12 | Kiro/Kiro IDEに存在しないself-install targetを新設しない | scope failure |
| RMR-13 | setupのoffline install/upgrade/verifyが同じgenerated payloadでgreenになる | `PROJECTION_DRIFT` |
| RMR-14 | writeによる生成後、同じtree digestでread-only drift checkがgreenになるまでreceiptを発行しない | false receipt |

## Documentation contract

| ID | ルール | 違反時 |
|---|---|---|
| RMR-15 | public driver値はexact 5値で、余分・欠落を許さない | `DOCS_CONTRACT_INCOMPLETE` |
| RMR-16 | User Guide、4 harness guide、developer reference、migration guide、env exampleをsource manifestで列挙する | `DOCS_CONTRACT_INCOMPLETE` |
| RMR-17 | 既存の英日pairは両方へ同じsemantic IDを反映する | docs parity failure |
| RMR-18 | harness別許容値、`auto`選択、topology precedenceを説明する | `DOCS_CONTRACT_INCOMPLETE` |
| RMR-19 | 明示driverのharness不一致/能力不足はside effect前hard errorと説明する | unsafe docs |
| RMR-20 | fallbackは`auto`かつdispatch前だけで、requested/selected/reasonをloud表示・監査すると説明する | silent fallback docs |
| RMR-21 | 0.1.x legacy全表、毎attempt warning、新旧併存`CONFLICTING_ENV`を説明する | compatibility docs failure |
| RMR-22 | macOS/Linuxをrelease criterion、Windowsを未保証と説明し、Windows successを表明しない | platform docs failure |
| RMR-23 | 0.2.0 migration Issueのlinkと「今回削除しない」をmigration guideへ記録する | migration docs failure |
| RMR-24 | generated skillの同期はpackage parityで検証し、`dist`をdocs正本として直接修正しない | source ownership failure |

## Deterministic verification

| ID | ルール | 違反時 |
|---|---|---|
| RMR-25 | macOSとGitHub Actions Linuxの両方でtypecheck/lint/complexityをgreenにする | `PLATFORM_RECEIPT_MISSING` |
| RMR-26 | 両platformでunit/integration/failure/security testをgreenにする | `PLATFORM_RECEIPT_MISSING` |
| RMR-27 | 両platformで非credentialのswarm-driver deterministic E2Eをgreenにする | `PLATFORM_RECEIPT_MISSING` |
| RMR-28 | 両platformでpackage/dist/self-install/setup検査をgreenにする | `PLATFORM_RECEIPT_MISSING` |
| RMR-29 | FR-01〜FR-26は最低1件のtestまたはlive evidence IDへ逆引きできる | coverage failure |
| RMR-30 | skip/not-runをgreen receiptへ変換せず、N/Aは要求非適用の根拠を必須にする | false coverage |
| RMR-31 | Linux live skipはmacOS credentialed live proofの代替にならない | false live proof |
| RMR-32 | Windows job、pass/fail列、未検証success表現を追加しない | scope/platform failure |

## Native live evidence

| ID | ルール | 違反時 |
|---|---|---|
| RMR-33 | credentialed native liveはローカルmacOSで4 driverすべて必須である | `LIVE_EVIDENCE_MISSING` |
| RMR-34 | 全journeyはproduction registry、C-01、harness conductor、C-11を通る | fake/live boundary failure |
| RMR-35 | Claude Agent Teams/Ultra CodeとCodex Ultraは各2 Unit以上、KiroはCLI/IDEの2 Unit/5 Unit journeyを満たす | `LIVE_EVIDENCE_MISSING` |
| RMR-36 | 各journeyはnative evidence、Unit成果、C-08、C-11 check/finalizeをANDする | false native success |
| RMR-37 | auth不足、unknown schema、park、skip、floor、legacy、xhigh-only/default childをpassにしない | false native success |
| RMR-38 | indexはallowlist summaryとdigestだけを持ち、raw stream/session/provider state、prompt、credential、absolute homeを拒否する | `LIVE_EVIDENCE_REDACTION_FAILED` |
| RMR-39 | provider Unitのsealed summaryを参照し、U-06でraw provider payloadを再parseしない | ownership failure |

## Migration Issue

| ID | ルール | 違反時 |
|---|---|---|
| RMR-40 | repositoryは`amadeus-dlc/amadeus`、markerは0.2.0用の固定値とする | `MIGRATION_ISSUE_INVALID` |
| RMR-41 | marker一致open Issueが1件なら再利用し、0件なら単一publisherが1件作成後に再検索してopen exactly 1件かつnumber一致を確認する | issue ensure failure |
| RMR-42 | marker一致が複数、closedのみ、またはcreate後競合なら自動作成/再open/削除を続けず停止する | duplicate/state failure |
| RMR-43 | title/bodyは日本語で、旧read/branch/warning/test/docs/generated artifact削除checklistを持つ | `MIGRATION_ISSUE_INVALID` |
| RMR-44 | Claude/Codex/Kiro CLI/Kiro IDEの全harness受入checklistを持つ | `MIGRATION_ISSUE_INVALID` |
| RMR-45 | Issue number/URL/marker/body digest/statusを検証してからlocal referenceをsealする | invalid reference |
| RMR-46 | 0.2.0削除そのものを今回のscopeで実装しない | scope expansion |

## Reportとbinding

| ID | ルール | 違反時 |
|---|---|---|
| RMR-47 | registry/projection/docs/platform/live/issueの6 domainをall-match ANDする | incomplete closure |
| RMR-48 | receiptは同一repository/tree digest/contract versionへ束縛する | `RELEASE_TREE_MISMATCH` |
| RMR-49 | duplicate receipt ID、stale commit、別worktree receiptを拒否する | `RELEASE_TREE_MISMATCH` |
| RMR-50 | findingはdomain/code/subjectでcanonical sortし、入力順でreport digestを変えない | nondeterministic report |
| RMR-51 | 1件でもred/missingなら`blocked`、全件greenだけを`closed`にする | false release closure |
| RMR-52 | `closed` reportはimmutableで、tree変更時は新candidateとして全receiptを再評価する | stale closure |
| RMR-53 | report/errorにcredential、prompt、raw payload、provider responseを含めない | confidentiality failure |
| RMR-54 | U-06はprovider behavior、selector、checkpoint、refereeを再実装しない | architecture failure |

## Decision table

| Registry | Projection/docs/tests | macOS live | Issue | 結果 |
|---|---|---|---|---|
| red | 任意 | 任意 | 任意 | blocked、該当Unitへ戻す |
| green | red/missing | 任意 | 任意 | blocked、U-06/CIを修正 |
| green | green | red/missing | 任意 | blocked、provider Unitをpark/修正 |
| green | green | green | invalid/missing | blocked、Issue ensureを修正 |
| green | green | green | open valid | closed |
