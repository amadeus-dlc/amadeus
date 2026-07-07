# Security Design — U6 Installer Test Harness

> Stage: construction / nfr-design  
> Unit: U6 Installer Test Harness

## Security Boundary

U6は安全なテスト環境を提供する。`security-requirements.md` の通り、テストはdeveloper workspaceやreal user projectsをmutationせず、live GitHub/npm credentialsを使わず、destructive-operation preventionをfake portsとtemp targetsで証明する。

## Isolation Controls

| Control | Design |
|---|---|
| temp target isolation | mutation testsはper-test temp root配下だけで実行し、target root assertionを行う。 |
| fake external dependencies | tag/archive/network behaviorはfake portsで注入し、deterministic suitesではlive network port使用をfailにする。 |
| fake filesystem faults | read/write/copy/rename/manifest/prompt/verify failuresを明示的に注入する。 |
| snapshot normalization | temp roots、separators、timestamps、version placeholdersをnormalizerで置換する。 |
| secret-safe logs | process environment全体をdumpせず、stdout/stderrはsecret scrubを通す。 |
| no-write coverage | every no-write branchにnegative mutation testをmappingする。 |
| backup evidence | changed/unknown shared overwriteはbackup-before-copyのcall orderとfilesystem stateをassertする。 |
| registry freshness | coverage registry entriesが実在testに対応することをcheckする。 |

## Fake Port Contract

Fake portsは単に成功値を返すだけでなく、call historyを保持する。ordering-sensitive testsは call sequence と arguments をassertする。Fake portsがunsafe runtime behaviorを隠さないよう、unexpected callsはfail-fastにできる。

Fake port examples:

- `FakeTagSourcePort`;
- `FakeArchiveSourcePort`;
- `FakeArchiveExtractorPort`;
- `FakeFileSystemPort`;
- `FakeManifestStorePort`;
- `FakePromptPort`;
- `FakeClockPort`.

## Coverage Evidence

Coverage registryはFR/US/NFR identifiersとtest idをmachine-readableに対応付ける。Must requirementが未対応ならfreshness checkをfailにする。Ratchetはmappingの意図しない減少をfailにする。Line coverage percentageは補助指標であり、主gateではない。

## Compliance And Data Handling

U6は規制対象データを扱わない。テストデータはsynthetic distribution filesとdisposable temp targetsに限定する。snapshotはtiny fixture contentsに限定し、real user file contentsを含めない。

## Upstream Coverage

- `performance-requirements.md`: isolation controls はCI実行時間内で動くfake/temp designにした。
- `security-requirements.md`: no live network、no real project mutation、secret-safe output、no-write/backup evidence を設計した。
- `scalability-requirements.md`: registryとsnapshotが増えてもmachine-readable/normalizedで維持する。
- `reliability-requirements.md`: fake port call history、cleanup diagnostics、deterministic failures をsecurity evidenceにした。
- `tech-stack-decisions.md`: fake ports、isolated temp directories、focused snapshots、coverage registry/ratchet に従う。
- `business-logic-model.md`: fixture workflow、coverage registry workflow、failure modes に沿う。
