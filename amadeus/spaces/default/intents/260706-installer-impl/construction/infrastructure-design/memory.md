# Infrastructure Design Memory — インストーラの実装

## Interpretations

- 2026-07-07T10:21:33Z — U1 Setup Package Shell の Infrastructure Design は hosted/cloud infrastructure ではなく、npm package boundary、local Bun CLI process、GitHub Actions validation、release dry-run/package dry-run evidence を対象にする。
- 2026-07-07T10:26:25Z — U2 Version And Distribution Source の Infrastructure Design は hosted/cloud infrastructure ではなく、public GitHub tag/archive source、per-invocation temp storage、fake-port CI fixtures、source diagnostics を対象にする。
- 2026-07-07T10:31:31Z — U3 Target State And Manifest の Infrastructure Design は hosted/cloud infrastructure ではなく、target-local read-only manifest/sentinel/snapshot boundary、fake filesystem fixtures、target-state diagnostics を対象にする。
- 2026-07-07T10:35:35Z — U4 Operation Planning And Safety の Infrastructure Design は hosted/cloud infrastructure ではなく、local in-process pure planner、injected backup predicate、plan invariant tests、CI fixture evidence を対象にする。
- 2026-07-07T10:39:30Z — U5 Apply Verify And UX の Infrastructure Design は hosted/cloud infrastructure ではなく、local sequential apply boundary、write-capable filesystem adapter、atomic manifest write、reporter snapshots、temp-dir/fault injection evidence を対象にする。
- 2026-07-07T10:48:19Z — U6 Installer Test Harness の Infrastructure Design は production infrastructure ではなく、repository-local Bun test helpers、fake ports、temp targets、snapshot normalizer、coverage registry/ratchet、CI-callable command surfaces を対象にする。
- 2026-07-07T10:53:04Z — U7 CI And Package Gates の Infrastructure Design は production infrastructure ではなく、GitHub Actions PR gates、Bun setup/cache、gate registry、normalized scanner findings、`.amadeus-ci/setup/` artifacts、stable check names を対象にする。
- 2026-07-07T10:58:43Z — U8 Manual Release And Docs の Infrastructure Design は production runtime infrastructure ではなく、manual `workflow_dispatch` release workflow、latest stable tag selection、dry-run default、protected publish environment、SBOM/provenance evidence、docs consistency checks を対象にする。

## Deviations

- 2026-07-07T10:21:33Z — U1 では database、cache、queue、load balancer、service discovery、monitoring stackを設計しない。U1はlocal CLI/package shellであり、services.mdがbackend serviceなしを明示しているため。
- 2026-07-07T10:26:25Z — U2 では persistent cache、authenticated GitHub access、offline bundled cache、hosted source mirror を設計しない。first release は canonical public repo と per-invocation temp extraction で十分であり、cache/credential設計は source integrity と secret boundary を広げるため。
- 2026-07-07T10:31:31Z — U3 では filesystem watcher、daemon、target lock、manifest repair、recursive scanを設計しない。U3はread-only detection/snapshotであり、write sequencingとpolicy decisionはU4/U5が所有するため。
- 2026-07-07T10:35:35Z — U3 reviewer 指摘により、broad `FileSystemPort` ではなく U3-local narrowed read-only ports をInfrastructure Designに明記した。fake filesystem assertionだけではno-write境界を型で保証できないため。
- 2026-07-07T10:35:35Z — U4 では daemon、queue、database、target lock、runtime rollback serviceを設計しない。U4はpolicyをplan contractへ閉じ込め、writes/backup/manifest/verificationはU5以降に残すため。
- 2026-07-07T10:39:30Z — U5 では rollback service、target lock、daemon、queue、database、hosted monitoringを設計しない。first releaseはpartial apply diagnosticsとbackup recordsを返し、自動rollbackは別設計が必要なfailure semantics変更であるため。
- 2026-07-07T10:48:19Z — U6 では live GitHub/npm、real user projects、release credentials、hosted test serviceを使わない。deterministic suitesはfake portsとtemp targetsだけでinstaller safetyを証明する必要があるため。
- 2026-07-07T10:53:04Z — U7 では npm publish、GitHub Release作成、tag作成、SBOM/provenance生成、post-publish verification、npm token設定を扱わない。U7成功はU8 handoff readyであり、release/publish実行はU8の手動workflow境界に残すため。
- 2026-07-07T10:58:43Z — U8 では ordinary push、merge、tag pushでのpublish、multi-package release、multi-registry release、release queueを設計しない。ユーザー要望はGitHub Actions buttonによる単一installer package releaseであり、first releaseはmanual low-volumeで十分なため。

## Tradeoffs

- 2026-07-07T10:21:33Z — U1のobservabilityはruntime telemetryではなくCI/smoke/package reportsに寄せる。長期稼働プロセスがないため、production monitoringよりdeterministic CLI diagnosticsとpackage validation evidenceの方が有効であるため。
- 2026-07-07T10:26:25Z — U2のobservabilityはhosted telemetryではなくsource-load diagnosticsとCI fixture evidenceに寄せる。GitHub network varianceをdeterministic gatesから切り離し、fake portsでretry/containment/metadata failureを証明するため。
- 2026-07-07T10:31:31Z — U3のobservabilityはhosted telemetryではなくclassification reason、manifest validation result、unknown md5 count、fake filesystem call historyに寄せる。targetを読むだけの単位なので、runtime metricsよりno-write evidenceとdeterministic diagnosticsが有効であるため。
- 2026-07-07T10:35:35Z — U3 manifest diagnostics は `readManifest(): InstallerManifest | null` から後で推測せず、`TargetDetection.diagnostics.manifestRead` に absent/invalid/unreadable/valid を保持する方針にした。invalid manifest fallback をTS実装とCI fixtureで安定検証するため。
- 2026-07-07T10:35:35Z — U4のobservabilityはhosted telemetryではなく `FileOperationPlan` fields、stable reason codes、fixture snapshots、invariant test outputに寄せる。destructive-operation preventionは本番監視よりPR時のdeterministic gateで証明する方が安全なため。
- 2026-07-07T10:39:30Z — U5のobservabilityはhosted telemetryではなく structured `SetupResult`、fake-port call trace、reporter snapshots、temp-dir fixture summariesに寄せる。U5は実際のtarget mutation境界なので、CIでcall-orderとfailure classificationを証明する方が有効であるため。
- 2026-07-07T10:48:19Z — U6のobservabilityはproduction monitoringではなく suite exit code、subset timing、fake-port call history、normalized snapshot diff、registry freshness report、ratchet diff、smoke command recordに寄せる。test harnessは本番運用ではなくCI証跡の基盤であるため。
- 2026-07-07T10:53:04Z — U7のobservabilityはruntime telemetryではなく GitHub Actions check status、per-gate JSON reports、normalized findings summaries、gate matrix、U8 handoff statusに寄せる。U7はmerge gateであり、本番運用監視ではないため。
- 2026-07-07T10:58:43Z — U8のobservabilityはruntime telemetryではなく release summary、release validation reports、SBOM/provenance artifacts、docs consistency report、npm publish result、post-publish verification evidenceに寄せる。releaseは低頻度のmaintainer operationであり、secret-safe CI evidenceが最も重要なため。

## Open questions

- 2026-07-07T10:43:52Z — U5 reviewer 指摘により、U7/code-generation では root `typecheck` / `lint` が `packages/setup/**/*.ts` を検証対象に含むようにする必要がある。現状の `tsconfig.json` と `package.json` lint script は setup package を含まないため。
