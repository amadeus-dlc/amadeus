# Scalability Design — U6 Installer Test Harness

> Stage: construction / nfr-design  
> Unit: U6 Installer Test Harness

## Scaling Model

U6はsingle repository内のinstaller test harnessとして拡張する。`scalability-requirements.md` の first-release targets は、100 mappings、250 test cases、2,000 temp target files、500 fake tags、40 snapshot cases、10 smoke commandsである。

## Capacity Boundaries

| Dimension | Design |
|---|---|
| mapped requirements/stories | machine-readable registryで100 mappingsまで高速checkする。 |
| installer test cases | typed fixture buildersで250 casesまで重複setupを抑える。 |
| temp target files | generated pathsとminimal contentsで2,000 filesを作る。 |
| fake tag entries | generated SemVer/prerelease/malformed/duplicate listsで500 entriesを扱う。 |
| reporter snapshots | 40 focused snapshotsを上限目安にし、large casesはstructured assertionsへ逃がす。 |
| smoke commands | 10 commandsまでに抑え、U7 CI logsを読みやすく保つ。 |

## Fixture Builder Strategy

Test setupはtyped fixture buildersに集約する。

- tag list builder;
- archive outcome builder;
- source distribution builder;
- target state builder;
- manifest builder;
- operation plan builder;
- prompt decision builder;
- apply failure builder.

各builderはscenario nameとcovers metadataを受け取り、失敗時diagnosticsにfixture nameとscenario nameを含める。

## Registry And Report Scaling

Coverage registryはper-requirement traceabilityを維持する。100 mappingsを超える場合はsummary groupingを追加してよいが、FR/US/NFR単位のmissing/stale checkは失わない。

CI handoff outputはGitHub Actions annotations/logsで読める量に保つ。full listはartifactや詳細logへ出し、summaryにはmissing mappings、ratchet diff、suite timingだけを出す。

## Growth Guardrails

- full suiteが120s p95を超えたらblocking gateとscheduled extended gateへ分割する。
- snapshotsがレビュー困難になったらstructured assertionへ移す。
- fixture generationがruntimeを支配する場合、1test process内cacheを検討する。ただしtest間でunsafe mutable stateを共有しない。
- 新harness追加時はsentinel、target-state、apply、reporter、registry casesをセットで追加する。

## Upstream Coverage

- `performance-requirements.md`: suite budgets と large fixture strategy をscaling planに反映した。
- `security-requirements.md`: scaling時もfake network/temp target isolationを維持する。
- `scalability-requirements.md`: capacity targets、growth triggers、test data strategy を直接反映した。
- `reliability-requirements.md`: deterministic builders、diagnostics、registry output をscaling modelに含めた。
- `tech-stack-decisions.md`: typed builders、focused snapshots、coverage registry、smoke commands 方針に従う。
- `business-logic-model.md`: test layers、fixture workflow、coverage registry workflow を拡張境界にした。
