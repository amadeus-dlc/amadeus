# Domain Entities — sealed-fixture-registry

## 上流境界

本モデルは`unit-of-work.md` のsealed-fixture-registry境界、`unit-of-work-story-map.md` のS-1/S-4/S-6/S-8/S-9、`requirements.md` のdefect closure / branch / security、`components.md` のSealed Fixture Registry、`component-methods.md` のseal / reveal / promote契約、`services.md` のCoordinator lifecycleを入力とする。arm implementation、cell verdict、eligibilityはentityへ含めない。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `DefectId` | closed registry row identifier。arm freeze前は非公開 | Registry |
| `PredicateId` | 7 atomic predicateまたは5 root clusterのstable alias | Registry |
| `DCount` | `7`または`5`だけ。`6`は表現不能 | Registry |
| `CommitSha` | repository内に実在するlowercase commit identity | Registry |
| `PatchIdentity` | canonical patch bytesのSHA-256 | Registry |
| `AllowedHunkSet` | path / old-new range / hunk hashのcanonical列 | Registry |
| `ProofIdentity` | canonical falling proof envelopeのSHA-256 | Registry |
| `ScanReceiptIdentity` | canonical zero-finding receiptのSHA-256 | Registry |
| `SealIdentity` | identity fieldを除くsealed payloadのSHA-256 | Registry |
| `FixtureAlias` | 意味を漏らさない公開opaque identifier | Registry |
| `DisclosureGrant` | event / seal / arm / freeze / worktree / path allowlistへbindしたopaque capability | Registry |

全identityはstrict parser通過済みcanonical JSON / bytesから生成する。branch名、mtime、会話時刻をidentity根拠にしない。

## Registry entities

`DefectRow`は `{ defectId, predicateId, sourceRefs, fixCommit, baselineSha, targetRegression, nonTargetRegressions, patchIdentity, allowedHunks, affectedPaths, rootCluster }` を持つ。source refsは一次資料へのrepository / GitHub identityだけで、外部選挙storeを参照しない。

`IndependentFallingProof`は `{ proofId, rowIdentity, baselineTree, injectedTree, commandIdentity, baselineReceipt, injectedReceipt, nonTargetReceipt, artifactRefs }` を持つ。baseline receiptは全green、injected receiptはtarget red、non-target receiptはbaseline同値を証明する。3 receiptのtool / test identitiesが一致しなければproofをmintしない。

`DefectUniverse`は `SevenPredicateUniverse | FiveRootClusterUniverse`のclosed unionである。前者は7 row / 7 independent proofのbijection、後者は全candidate rowから5 clusterへのtotal mappingと5 representative proofs、denominator correction receiptを持つ。6件や部分mappingをconstructorで表現できない。

## Fixture lifecycle

fixture stateは次の単方向遷移だけを持つ。

```text
CANDIDATE -> PROVEN -> BRANCHED -> SCANNED -> SEALED
SEALED -> DISCLOSED_TO_TLA | DISCLOSED_TO_TS
all SEALED + valid permission -> PROMOTED_MANIFEST
```

`FixtureBranch`は `{ fixtureAlias, baselineSha, branchRef, injectionSha, treeHash, patchIdentity, allowedHunks, proofIdentity }` を持つ。branch refは便利なlocatorでありidentityではない。parent / diff containment / proof linkageを再検証できる。

`SealedPayloadManifest`は全payloadのlogical path、content hash、byte lengthをcanonical順で持つ。symlink、directory entry、allowlist外pathを受理しない。

`DataSafetyReceipt`は `{ payloadManifestIdentity, scannerVersion, ruleSetIdentity, scannedEntryIdentities, secretCount: 0, personalDataCount: 0, externalStoreRefCount: 0, completedAt, receiptIdentity }` のsuccess variantである。manifest entriesとscanned entriesがbijectionの場合だけ生成し、scan tool / read failureはreceiptを作らず`ScanError`を返す。

`SealedFixture`はbranch、proof、scan、disclosure payload identitiesを束ねるimmutable recordである。payloadはarm authoring allowlist外のintent recordに置き、content-addressed pathへatomic publishする。

## Disclosure and promotion entities

`DisclosureEvent`は `{ eventId, arm, worktree, fixtureAlias, frozenEventId, sealedIdentity, disclosureHash, grantIdentity, at }` を持つappend-only eventである。eventと`DisclosureGrant`はarm / fixture共有successor slotへatomic commitする。同じarm / fixtureの重複eventと、freeze event以前の時刻を拒否する。

`DisclosureMaterializationReceipt`はcommit済みevent / grant、target worktree、allowlisted destination、materialized content identityを結ぶ。Registry portだけがgrantを解決し、arm codeへsealed storeの直接read capabilityを渡さない。

`ManifestPromotionPermission`はCoordinatorだけがmintするopaque single-use valueで、blind state identity、T/S freeze event IDs、skeleton pass event ID、closed D-COUNT、expiryではなくone-time nonceを持つ。Registryはstateを再foldし、permissionの全参照を照合する。

`PromotedFixtureManifest`は `{ schemaVersion, baselineSha, dCount, orderedEntries, universeIdentity, promotionPermissionIdentity, manifestIdentity }` を持つ。各entryはfixture alias、branch / injection SHA、patch / proof / payload manifest / scan / seal identitiesを含む。ordered entriesはaliasのUnicode code point順で、identity fieldを除いたcanonical JSONからmanifest identityを生成する。

`PromotionTransaction`はpermission nonceをkeyに、permission claim、promoted manifest、promotion eventを同じimmutable directoryへ持つ。nonce共有slotへのexclusive atomic commitによりsuccessorを1件に限定する。同一canonical transaction再送だけをidempotent successとし、異内容再利用を拒否する。

## Ports and errors

| Port / operation | Input → Output | Failure |
| --- | --- | --- |
| `ProofRunner.prove` | candidate / isolated worktree → falling proof | baseline、target、non-target不成立 |
| `BranchInspector.verify` | baseline / branch / allowed hunks → fixture branch | parent、merge、diff逸脱 |
| `FixtureScanner.scan` | sealed payload manifest / fixed rules → data safety receipt | set mismatch、match、read、tool、rule drift |
| `SealedStore.publish` | verified fixture → sealed identity | overwrite、collision、partial I/O |
| `Registry.reveal` | seal / arm freeze / target worktree → atomic event + grant | state、arm、order、duplicate、commit |
| `Registry.materialize` | committed grant / destination → materialization receipt | event、binding、path、identity |
| `Registry.promote` | universe / seals / permission → atomic promotion transaction | nonce claim、permission、count、proof、scan欠損 |

error taxonomyは`RegistrySchemaError / ProofError / BranchIsolationError / ScanError / SealError / DisclosureError / PromotionError`のclosed unionである。各errorは対象row / fixture identity、expected / actual、causeを保持し、warningやsuccessへ丸めない。
