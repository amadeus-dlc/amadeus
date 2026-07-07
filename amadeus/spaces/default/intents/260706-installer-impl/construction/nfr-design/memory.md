# NFR Design Memory — インストーラの実装

## Interpretations

- 2026-07-07T09:28:18Z — U1 Setup Package Shell の NFR Design は local CLI/package shell の module isolation、safe wrapper delegation、parser/help/error renderer、package metadata gate に限定し、version resolution、target detection、planning、apply、manifest、release publish は downstream units/stages が所有する。
- 2026-07-07T09:37:07Z — U2 Version And Distribution Source の NFR Design は SemVer resolver、TagSourcePort、ArchiveSourcePort、ArchiveExtractorPort、Distribution Metadata Reader、Temp Directory Manager に限定し、target detection、planning、apply、manifest write、release publish は downstream units/stages が所有する。
- 2026-07-07T09:43:20Z — U3 Target State And Manifest の NFR Design は ManifestReader、SentinelDetector、TargetSnapshotBuilder、PathPolicy、StateClassifier に限定し、planning、apply、manifest write、release publish は downstream units/stages が所有する。
- 2026-07-07T09:49:19Z — U4 Operation Planning And Safety の NFR Design は OperationPlanner、VersionPolicy、TargetStatePolicy、FileClassifier、CollisionPolicy、BackupPlanner、PlanValidator に限定し、prompt、reporting、filesystem read/write、apply、manifest write、release publish は downstream units/stages が所有する。
- 2026-07-07T09:56:50Z — U5 Apply Verify And UX の NFR Design は SetupApplicationService、Reporter、PromptAdapter、FileApplier、ManifestStore、Verifier、ResultClassifier に限定し、version resolution、target detection、planning policy recomputation、release publish は upstream/downstream units が所有する。
- 2026-07-07T10:02:59Z — U6 Installer Test Harness の NFR Design は FixtureBuilderKit、FakePortKit、TempTargetManager、SnapshotNormalizer、CoverageRegistry、RegistryFreshnessCheck、CoverageRatchetCheck、SmokeCommandRunner に限定し、runtime installer behavior、live GitHub integration、npm publication、release workflow fan-out は別unit/stageが所有する。
- 2026-07-07T10:08:06Z — U7 CI And Package Gates の NFR Design は InstallerChangeDetector、GateRegistry、GatePlanner、GateRunner、PackageMetadataGate、PackageDryRunGate、CoverageGate、SecurityGate、DriftGuard、GateReporter に限定し、npm publish、GitHub Release作成、tagging、SBOM/provenance、post-publish verification は U8 が所有する。
- 2026-07-07T10:13:39Z — U8 Manual Release And Docs の NFR Design は ReleaseWorkflow、ReleaseInputValidator、ReleaseTagSelector、ReleasePreflightRunner、PackageBuilder、ReleaseEvidenceGenerator、PublishValidator、PublishExecutor、PostPublishVerifier、DocsConsistencyChecker、ReleaseReporter に限定し、ordinary push/merge/tag push publishing、multi-registry publishing、multiple package publishing、organization-wide rollout は扱わない。

## Deviations

- 2026-07-07T09:28:18Z — U1 では追加の NFR design 質問を実施しない。U1 NFR requirements と functional design で startup budget、no-write boundary、Bun wrapper、parser command contract、package metadata validation が固定済みであるため。
- 2026-07-07T09:37:07Z — U2 では追加の NFR design 質問を実施しない。U2 NFR requirements と functional design で canonical repo、SemVer ordering、retry ownership、archive extraction boundary、metadata fallback/error policy が固定済みであるため。
- 2026-07-07T09:43:20Z — U3 では追加の NFR design 質問を実施しない。manifest-first detection、sentinel fallback、ambiguous harness、read-only snapshot、unknown md5、no-write boundary が既存成果物で固定済みであるため。
- 2026-07-07T09:49:19Z — U4 では追加の NFR design 質問を実施しない。pure planner、no-write plan、backup-before-update、force/yes semantics、target state branches、operation plan contract が既存成果物で固定済みであるため。
- 2026-07-07T09:56:50Z — U5 では追加の NFR design 質問を実施しない。pre-apply rendering、prompt suppression、ordered apply、backup-before-copy、atomic manifest write、post-apply verification、classified reporting が既存成果物で固定済みであるため。
- 2026-07-07T10:02:59Z — U6 では追加の NFR design 質問を実施しない。Bun/TypeScript test runner、typed fixture builders、fake ports、isolated temp targets、snapshot normalizers、coverage registry、ratchet checks、smoke commands が既存成果物で固定済みであるため。
- 2026-07-07T10:08:06Z — U7 では追加の NFR design 質問を実施しない。GitHub Actions、Bun/TypeScript gate scripts、installer-related path classifier、Concrete Gate Execution Contract、normalized security schemas、coverage registry/ratchet、dist/promote drift guards、U8 handoff boundary が既存成果物で固定済みであるため。
- 2026-07-07T10:13:39Z — U8 では追加の NFR design 質問を実施しない。GitHub Actions workflow_dispatch、latest stable SemVer tag default、dry_run:true default、confirm package guard、protected environment、exactly one publish identity mode、U7 release preflight、SBOM/provenance、publish validation、post-publish verification、installer-first docs が既存成果物で固定済みであるため。

## Tradeoffs

- 2026-07-07T09:28:18Z — U1 は circuit breaker、cache、queue、autoscaling などの service NFR pattern を導入しない。U1 は single-process CLI shell であり、重要なのは heavy import/target access を避ける component isolation と deterministic exit behavior であるため。
- 2026-07-07T09:37:07Z — U2 は first release で persistent distribution cache を導入しない。performance は fake/local fixture で bounded にしつつ、cache invalidation が source integrity と tag provenance を複雑化するリスクを避けるため。
- 2026-07-07T09:43:20Z — U3 は process-wide cache、recursive target scan、manifest repair を導入しない。安全性とdeterminismを優先し、manifest/sentinel/expected-file のbounded readだけで分類とsnapshotを作るため。
- 2026-07-07T09:49:19Z — U4 は filesystem port、prompt adapter、reporter、applierをplanner内へ注入しない。policy decisionをpure functionに閉じることで、no-write reason、backup ordering、force/yes branchをfixtureで網羅できるため。
- 2026-07-07T09:56:50Z — U5 はrollback workflowとparallel copyを導入しない。backup records、partial apply diagnostics、atomic manifest write sequencingを優先し、初期実装の安全性とテスト可能性を保つため。
- 2026-07-07T10:02:59Z — U6 はlive GitHub/npm credentialsやreal user project fixturesをblocking testsへ入れない。fake ports、temp targets、coverage registryでdeterministicかつ安全な品質証跡を作るため。
- 2026-07-07T10:08:06Z — U7 はrelease-readyを宣言せずU8 handoff readyだけを宣言する。PR gateとmanual release/publishの責務を分け、merge前品質証跡と公開操作を混同しないため。
- 2026-07-07T10:13:39Z — U8 はdry-runとpublishで同じvalidation pathを共有し、publishだけをapproval/identity後に分岐させる。GitHub Actions button releaseのrehearsal fidelityを保ち、manual publish事故を防ぐため。

## Open questions
