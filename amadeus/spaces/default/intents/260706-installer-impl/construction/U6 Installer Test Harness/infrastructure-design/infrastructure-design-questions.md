# Infrastructure Design Questions — U6 Installer Test Harness

> Stage: construction / infrastructure-design  
> Unit: U6 Installer Test Harness

## Questions

### Q1. U6のテスト基盤でlive GitHub/npm、実ユーザーproject、またはrelease credentialを使うか

[Answer]: No. U6はrepository-local test harnessとして、fake ports、temp targets、synthetic fixtures、snapshot normalizer、coverage registry/ratchetだけを使う。live GitHub/npm、real user projects、release credentials、hosted test serviceは使わない。

## Ambiguity Analysis

曖昧な回答はない。`business-logic-model.md` はU6をU1-U5 contractsのdeterministic verificationに限定し、runtime installer behaviorやpublicationを実装しないと定義している。

矛盾はない。`security-design.md` はno live network、temp target isolation、secret-safe logsを要求し、`reliability-design.md` はfake ports、injected clocks、normalized snapshots、registry freshness/ratchetを要求している。Infrastructure Designはlocal CI-callable command surfaceとtest evidence storageに限定する。

不足情報はない。具体的なscript名、fixture file layout、coverage registry file pathは code-generation/build-and-test が所有する。ただしU7が個別に呼べるunit/integration/smoke/snapshot/registry/ratchet commandsは必須とする。

## Upstream Coverage

- `performance-design.md`: suite budgets、command partitioning、measurement planを反映する。
- `security-design.md`: fake dependencies、temp isolation、secret-safe output、no-write/backup evidenceを反映する。
- `scalability-design.md`: 100 mappings、250 cases、2,000 temp files、500 fake tags、40 snapshots、10 smoke commandsを反映する。
- `reliability-design.md`: deterministic builders、fake ports、snapshot normalization、flake preventionを反映する。
- `logical-components.md`: FixtureBuilderKit、FakePortKit、TempTargetManager、SnapshotNormalizer、CoverageRegistry、RegistryFreshnessCheck、CoverageRatchetCheck、SmokeCommandRunnerを前提にする。
- `components.md`: setup package runtime componentsをtest subjectとして扱い、テスト基盤をruntime componentにしない。
- `services.md`: GitHub Actions PR gates、local in-process services、manual release postureを反映する。
- `business-logic-model.md`: test layers、fixture workflow、coverage registry workflow、integration boundariesを反映する。
