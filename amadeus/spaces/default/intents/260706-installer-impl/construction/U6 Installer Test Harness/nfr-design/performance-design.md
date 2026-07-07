# Performance Design — U6 Installer Test Harness

> Stage: construction / nfr-design  
> Unit: U6 Installer Test Harness

## Design Goals

U6の性能設計は、installerの品質ゲートに必要なtest evidenceをCIで実用的な時間に収めることにある。`performance-requirements.md` の通り、live GitHub、npm publication、real user projects は測定対象に含めない。

## Suite Budget

| Suite | Budget | Design |
|---|---:|---|
| full deterministic installer suite | p95 <= 120s | unit/integration/smoke/snapshot/registryをblocking commandとしてまとめる。 |
| U1-U4 pure unit subset | p95 <= 20s | parser/resolver/planner/schema helpersはfake portsとin-memory fixturesで実行する。 |
| U3-U5 temp filesystem integration subset | p95 <= 60s | per-test temp dirsを使い、large fixturesは生成assertionにする。 |
| CLI smoke subset | p95 <= 30s | `--help`、clean install temp target、no-write collisionなど最小entrypointに絞る。 |
| coverage registry freshness | p95 <= 5s | machine-readable registryを読み、mapped testsの存在を確認する。 |
| coverage ratchet | p95 <= 5s | previous/current mapping countとMust coverageを比較する。 |

## Fixture Performance Strategy

Typed fixture buildersは最小内容のsynthetic filesを生成する。large source/target casesは2,000 pathsを生成するが、必要最小のfile contentsだけを書く。reporter large casesは巨大snapshotをcommitせず、counts、example rows、normalized output invariantsをassertする。

Fake tag listsは500 entriesまでin-memoryで作る。Fake archive fixturesはsuccess、transient-then-success、retry exhaustionをdeterministicに表現し、network timingに依存しない。

## Command Partitioning

Concrete package script names は code-generation/build-and-test が決めるが、U6はU7が独立に呼べる次のcommand surfaceを要求する。

- installer unit tests;
- installer integration tests;
- installer smoke tests;
- installer snapshot tests;
- coverage registry freshness check;
- coverage ratchet check.

full suiteが120s p95を超えた場合は、blocking smoke/contract gates と scheduled extended tests に分割する。

## Measurement Plan

U7 CIではsuite timingsを収集し、budget超過時にどのsubsetが遅いかを分けて表示する。性能失敗よりもcorrectness/isolation failureを優先し、live network call、real project mutation、temp dir leak があれば時間内でもfailにする。

## Upstream Coverage

- `performance-requirements.md`: suite budgets、measurement protocol、resource constraints を設計に反映した。
- `security-requirements.md`: fake ports、temp isolation、snapshot normalization を性能戦略に含めた。
- `scalability-requirements.md`: mappings/test cases/temp files/tags/snapshots/smoke command targets をcapacityにした。
- `reliability-requirements.md`: deterministic output、cleanup diagnostics、flake prevention を測定の前提にした。
- `tech-stack-decisions.md`: Bun test runner、typed builders、focused snapshots、registry/ratchet 方針に従う。
- `business-logic-model.md`: test layers、fixture workflow、coverage registry workflow に沿う。
