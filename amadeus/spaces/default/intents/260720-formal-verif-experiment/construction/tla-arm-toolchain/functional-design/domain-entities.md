# Domain Entities — tla-arm-toolchain

## 上流境界

本モデルは`unit-of-work.md` のtla-arm-toolchain境界、`unit-of-work-story-map.md` のS-3/S-4/S-6/S-8、`requirements.md` のblind TLA arm / deterministic verdict、`components.md` のArm T Adapter / TLC Toolchain、`component-methods.md` の`TlcProfile` / exploration、`services.md` のacquire / offline runを入力とする。fixture identity、TS implementation、eligibilityはentityへ含めない。

U3 `execution-evidence`はE-FVEU3FD1でREADY扱いされず、第三review未実施である。本Unitのport integration statusは`DESIGNED_PENDING_U3_HUMAN_GATE`とし、最新sensor PASSをreviewer READYへ読み替えない。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `TlcVersion` | literal `1.7.4` | Toolchain |
| `TlcJarIdentity` | fixed descriptorと実bytesが一致するSHA-256 | Toolchain |
| `JdkIdentity` | OpenJDK 26.0.1 vendor token / executable hash / version output identity | Toolchain |
| `TlcProfileIdentity` | closed finite domain profileのSHA-256 | Arm T |
| `PublicContractIdentity` | arm間共有contract bundleのSHA-256 | Experiment Contract |
| `FrozenModelIdentity` | module / cfg / profile / contract manifestのSHA-256 | Arm T |
| `TlcRunIdentity` | jar / JVM / model / argv / subject / deadline manifestのSHA-256 | Arm T |
| `CounterexampleIdentity` | invariant / canonical ordered traceのSHA-256 | Arm T |

identityはstrict parser通過済みcanonical bytesから生成し、cache path、mtime、branch名を根拠にしない。

## Toolchain and model entities

`TlcArtifactDescriptor`は `{ version: 1.7.4, url, sha256, fileName, redirectOrigins: github.com / objects.githubusercontent.com / release-assets.githubusercontent.com, maxBytes: 134217728, integrity: HASH_ONLY }` のclosed entityである。`VerifiedTlcArtifact`はdescriptor identity、actual hash / length、content-addressed cache reference、verification receipt、JDK identityを持つ。constructorはacquisitionまたはoffline re-verification成功経路だけが公開する。

`JdkRunProfile`はvendor `OpenJDK`、version `26.0.1`、freeze時java executable hash、heap `-Xms256m / -Xmx1024m`、UTF-8 / en_US / UTC system flagsを持つclosed entityである。

`FiniteElectionDomain`は3 voters、valid choices 3件と`UNKNOWN_CHOICE`、submitted tokens 3 valid+2 invalid、received tokens 3件、accepted-ref tokensと`UNKNOWN_REF`、GoA 1..8、initial / amend per-voter budget各1、global hold budget 1、total timestamp orderを持つ。`TlcProfile`はdomainとworkers=1を束ね、unknown fieldや別cardinalityを表現できない。

`ElectionModelState`はaccepted / late ballot sequences、arrival sequence、voter別initial / amend budgets、global hold budget、hold marker sequence、optional tally receipt、last outcomeを持つ。`TallyReceipt`は`Hold(BLOCK / DISCUSSION_NEEDED / QUORUM_SHORT / TIE) | Established(winner, counts)`のclosed unionである。`ModelAction`は`SubmitOriginal / SubmitAmend / Tally / RecordHold / TerminalStutter`のclosed unionで、各actionはbusiness logic modelのvalidation precedenceとprecondition / effect tableに一致する。

`FrozenModelBundle`は `{ modelIdentity, moduleBytesIdentity, cfgBytesIdentity, profileIdentity, publicContractIdentity, namedInvariantFormulas, invariantSourceMap, freezeRevision }` を持つ。named invariantsはchoice winner、unknown choice、receivedAt、invalid timestamp、amend submission、unknown reference、per-voter resolutionのclosed 7件で、各formula identityとmodule line / column spanを含む。

## Run and result entities

`TlcRunManifest`は `{ runIdentity, jarIdentity, jdkIdentity, modelIdentity, subjectAlias, argvIdentity, cwdIdentity, locale, timezone, heapPolicy, workers: 1, deadlineMs }` を持つ。subject aliasはfixtureの意味や期待verdictを含まない。

`RawTlcOutcome`はexit code / signal、stdout / stderr identities、started / finished monotonic time、timeout flagを持つ。raw bytesはU3 Evidence portへ渡し、U4内で上書きしない。

`TlcExploration`は次のclosed unionである。

- `CounterexampleExploration`: named invariant、source location、ordered canonical state trace、counterexample identity、terminal marker。
- `CompleteExploration`: generated states、distinct states、states left on queue=`0`、search depth、completion marker、termination reason `EXHAUSTED`。
- `FailedExploration`: timeout、tool / parser error、unknown marker、incomplete warningとraw reference。

normalizerはcounterexample variantを`DETECTED`、complete variantを`NOT_DETECTED`、failed variantを`HARNESS_ERROR`へ写像する。verdictはraw outcome identity、model / jar / profile identities、counterexampleまたはcompletion proofを参照する。

## Ports and errors

| Port / operation | Input → Output | Failure |
| --- | --- | --- |
| `ArtifactFetcher.fetch` | fixed descriptor → staged bytes | HTTPS、redirect、length、I/O |
| `ArtifactCache.publish` | verified staged bytes → cached artifact | checksum、collision、partial publish |
| `ArtifactCache.verifyOffline` | descriptor / cache → verified artifact | missing、hash drift、fallback禁止 |
| `ModelGenerator.generate` | public contract / closed profile → frozen model | schema、domain、blind input violation |
| `TlcProcess.run` | verified artifact / model / subject / deadline → raw outcome | spawn、signal、timeout |
| `TlcParser.parse` | raw outcome / run manifest → exploration union | marker、trace、stats、version drift |
| `TlaNormalizer.normalize` | exploration / provenance → `CellResult` | proof / schema不一致 |

errorsは`AcquisitionError / CacheIntegrityError / ModelError / InvocationError / TlcOutputError / NormalizationError`のclosed unionで、descriptor、run / model identity、raw reference、causeを保持する。`AcquisitionError`や`CacheIntegrityError`を検出成功へ変換しない。
