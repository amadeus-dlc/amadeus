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
| 5 | `ReceiptSchemaGuard` | platform/run SHA/verdict/ID、transport/capture/resource closed variant、versioned invocation contract | domain green前 |
| 6 | `NativeLiveIndexValidator` | sealed summaryだけ、4 driver exact set、canonical argv digest、process terminal後evidence | live green前 |
| 7 | `MigrationIssueReferenceGuard` |全page検索、件数照合、fixed repo/marker/number/URL/body/status再照合 | Issue green前 |
| 8 | `ClosureReportProjector` | code/subject/digest allowlist、secret/path禁止 | report seal前 |

## Provenance and source ownership

全receipt/index/reportはsame repository、release input tree digest、contract version、candidate IDへexact bindする。duplicate receipt ID、stale SHA、別worktree、別candidateを拒否する。CI URLだけ、ローカルpath、自己申告はproofにしない。

authored sourceは`packages/framework`、generated distは4 harness manifest、self-installは既存Claude/Codex targetだけを正本mappingで検証する。generated targetの直接編集、orphan、hand-edited dist、Kiro/Kiro IDE self-install新設をgreenにしない。

production registryはfake/no-op/test/unavailable adapter、dynamic import、unknown/extra descriptorを拒否する。source regexやfile existenceだけでassembly成功を推測しない。

## Data minimization and Issue safety

- provider liveはdriver/harness/platform/profile、execution/run digest、transport/capture/resource receipt、versioned `invocationContractId`とcanonical argv digest、必要なbinding/control/process terminal/terminal-retained-evidence digest、Unit/child/wave count、C-08/C-11 verdict、evidence digestだけを受ける。
- Agent Teams=`pty-interactive`+`fixed-provider-path`、Ultra=`stdio-json`+`event-bound-provider-path`、Codex=`stdio-json`+`hook-only`、Kiro=`stdio-json`+`event-bound-provider-path`へ閉じ、相互代替を拒否する。Ultraはさらにversioned contractが示す`claude -p --verbose --effort ultracode --output-format stream-json --include-hook-events`のcanonical argv digestとexact一致させる。
- prompt、raw PTY/JSONL/session/state、summary text、credential、absolute home/worktree、full CI logをinput/report schemaに含めない。
- error/findingはdomain/code/subject、expected/observed digestだけを持つ。
- Issue publisherはfixed repository/marker、日本語title/body/checklistだけを使い、tokenをbody/log/referenceへ保存しない。
- Issue検索はpaginationを終端まで取得し、authoritative total countが提供される場合は列挙件数と照合する。page/limit打切り、件数不一致、schema不明、open複数、closed-only、create競合時はreopen/delete/additional createで自動修復しない。

## Threat containment and verification

| Threat | Control | Test |
|---|---|---|
| stale/別repo proof spoof | candidate binding | stale SHA/別worktree/duplicate fixture |
| generated tamper | source ownership + read-only drift | hand edit/orphan fixture |
| fake/live elevation | production registry/live exact variant + invocation contract set | fake/skip/floor/legacy/ready-only/wrong-variant/wrong-argv fixture |
| raw data disclosure | closed summary/report schema | credential/prompt/PTY/JSONL/session/path canary |
| Issue spoof/race | fixed marker/repo + complete re-search | wrong number/URL/body/open2/incomplete-page/total-count fixture |
| arbitrary network mutation | single publisher state machine | create/reopen/delete spy |

secret漏えい、fake/live昇格、ready signal単独成功、不完全Issue検索からのmutation、generated source ownership違反をmerge blockerにする。新GitHub SDK、cloud service、database、dynamic pluginを追加しない。
