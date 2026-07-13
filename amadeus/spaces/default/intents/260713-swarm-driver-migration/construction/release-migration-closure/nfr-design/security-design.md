# Release & Migration Closure Security Design

## 入力契約とtrust boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。trust boundaryはrepository tree、production composition、generated projection、platform receipt、provider live summary、coverage reference、GitHub Issue stateからclosed candidate/report domainへの入口である。既存provider/GitHub authを使うがcredentialをreceipt/report/docsへ保存しない。

## Defense-in-depth layers

| Layer | Component | Control | Rejection |
|---|---|---|---|
| 1 | `ReleaseInputManifestGuard` | authored/generated fixed path、runtime/output除外 | candidate生成前 |
| 2 | `CandidateBindingGuard` | repository/tree/contract/candidate exact match | receipt集約前 |
| 3 | `ProductionRegistryClosureCheck` |実composition/public lookup、closed set/cardinality | registry green前 |
| 4 | `ProjectionOwnershipGuard` | source manifest + generate/read-only drift | projection green前 |
| 5 | `ReceiptSchemaGuard` | platform/run SHA/verdict/ID closed allowlist | domain green前 |
| 6 | `NativeLiveIndexValidator` | sealed summaryだけ、4 driver exact set | live green前 |
| 7 | `MigrationIssueReferenceGuard` | fixed repo/marker/number/URL/body/status再照合 | Issue green前 |
| 8 | `ClosureReportProjector` | code/subject/digest allowlist、secret/path禁止 | report seal前 |

## Provenance and source ownership

全receipt/index/reportはsame repository、release input tree digest、contract version、candidate IDへexact bindする。duplicate receipt ID、stale SHA、別worktree、別candidateを拒否する。CI URLだけ、ローカルpath、自己申告はproofにしない。

authored sourceは`packages/framework`、generated distは4 harness manifest、self-installは既存Claude/Codex targetだけを正本mappingで検証する。generated targetの直接編集、orphan、hand-edited dist、Kiro/Kiro IDE self-install新設をgreenにしない。

production registryはfake/no-op/test/unavailable adapter、dynamic import、unknown/extra descriptorを拒否する。source regexやfile existenceだけでassembly成功を推測しない。

## Data minimization and Issue safety

- provider liveはdriver/harness/platform/profile、execution/run digest、Unit/child/wave count、C-08/C-11 verdict、evidence digestだけを受ける。
- prompt、raw stream/session/state、summary text、credential、absolute home/worktree、full CI logをinput/report schemaに含めない。
- error/findingはdomain/code/subject、expected/observed digestだけを持つ。
- Issue publisherはfixed repository/marker、日本語title/body/checklistだけを使い、tokenをbody/log/referenceへ保存しない。
- open複数、closed-only、create競合時はreopen/delete/additional createで自動修復しない。

## Threat containment and verification

| Threat | Control | Test |
|---|---|---|
| stale/別repo proof spoof | candidate binding | stale SHA/別worktree/duplicate fixture |
| generated tamper | source ownership + read-only drift | hand edit/orphan fixture |
| fake/live elevation | production registry/live exact set | fake/skip/floor/legacy fixture |
| raw data disclosure | closed summary/report schema | credential/prompt/session/path canary |
| Issue spoof/race | fixed marker/repo + re-search | wrong number/URL/body/open2 fixture |
| arbitrary network mutation | single publisher state machine | create/reopen/delete spy |

secret漏えい、fake/live昇格、任意Issue mutation、generated source ownership違反をmerge blockerにする。新GitHub SDK、cloud service、database、dynamic pluginを追加しない。
