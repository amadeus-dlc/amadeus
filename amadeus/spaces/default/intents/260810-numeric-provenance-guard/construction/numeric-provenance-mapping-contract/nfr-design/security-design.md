# Security Design — numeric-provenance-mapping-contract

本UnitのNFR Requirements入力はscopeによりabsent-and-expectedであり、宣言済みのSEC-* requirement IDは存在しない。そのため新しいsecurity requirement IDは作らず、既存契約だけへtraceする。相対linkの拒否境界は `requirements.md:22`、sweep corpusとsample identityは `requirements.md:34`、mapping authorityは `requirements.md:37`、新規runtime dependency禁止は `requirements.md:57` に対応する。Functional Designのsnapshot固定は `business-rules.md:7-11`、candidate rootは `business-rules.md:13-19`、digest approvalは `business-rules.md:67-71`、aggregate integrityは `domain-entities.md:7-24` に定義済みである。

## Security scope and non-applicability

保護対象は次のlocal design-time assetsである。

- 同一HEADに固定されたCorpusSnapshotと全ArtifactDescriptor。
- 決定的sample identity、二値label、distance/statistics。
- authorityとなるSweepReportとNumericProvenanceMapping。
- mapping digestへ結び付くMappingApprovalと生成projection。

新規network endpoint、database、credential、secret、user session、cloud resourceは存在しない。したがってauthentication、authorization service、TLS、at-rest encryption、CSRF/XSS、security header、IAM/KMS/VPCは非該当である。repositoryとCI runnerの既存access controlを超える権限機構は追加しない。

## Trust boundaries

### TB-1: Repository root to corpus reader

corpus readerは入力pathを信頼せず、read前にrepository root基準でPOSIX normalizeし、次のallowlistだけを受理する。

- active spaceのintent record配下にある対象phase/stage Markdown。
- active spaceの各repositoryにある `codekb/<repo>/re-scans/*.md`。

absolute path、root escape、別space/別root、directory、allowlist外のsymlink解決先を拒否する。directory enumerationの結果はbytewise relative-path順へ正規化し、filesystemの返却順をauthorityにしない。

### TB-2: Untrusted Markdown to predicate

Markdown本文はuntrusted dataとして扱う。backtick内のcommand、SHA、relative linkは文字列として解析するだけで、process spawn、shell評価、network fetchを行わない。linkのfragment除去・normalize・root containment・通常file確認を完了するまでtargetを根拠として受理しない。

### TB-3: Sweep authority to generated projection

Generated Mappingとstage配線はauthority artifactからの一方向projectionであり、runtime-side editを入力へ逆流させない。projection consumerはauthority digest/schema revisionを照合し、不一致をfallbackやlatest-file-winsで吸収しない。

## Integrity controls

### Immutable digest chain

次の各valueをcanonical serialization後にSHA-256で結ぶ。

```text
schemaRevision + CorpusSnapshot / corpusContent digest
  -> ArtifactCatalog / candidate identities
  -> labeled sample set digest
  -> classification evidence digest
  -> SweepReport / Mapping digest
  -> recomputation digest
  -> MappingApproval
  -> generated projection digest
```

canonicalizationはUTF-8、LF、POSIX relative path、bytewise collection order、stable key orderを固定する。数値authorityはnon-negative integer、または `{numerator, denominator}` の既約なnon-negative rationalとして表現し、leading zero、負のゼロ、浮動小数、指数表記、NaN/Infinityを許さない。timestamp、absolute workspace path、filesystem enumeration順は意味digestへ含めない。

### Snapshot consistency

sweep開始時にallowlistを全件列挙し、各regular fileの `relativePath + SHA-256(raw file bytes)` をbytewise path順で束ねた `corpusContentDigest` をCorpusSnapshotへ固定する。完了直前にallowlistを再列挙して全file digestを再計算し、開始時と一致することを確認する。これによりHEADが同じでもdirty/untracked fileの追加・削除・内容変更を検出する。

同時にobserved Git SHA、graph revision、predicate revisionも開始/終了で比較する。いずれかが異なればpartial resultを承認せず `snapshot-changed` として全体を新snapshotで再実行する。入力欠落、identity衝突、label不備、mapping conflictもtyped failureとし、silent skipや部分承認を許さない。

### Approval binding

MappingApprovalは `schemaRevision`、snapshot digest（corpusContentDigestを内包）、mapping digest、recomputation digest、approver role、verdictを必須とする。approval receipt digestはこれら全fieldのcanonical payloadから生成する。READYはschemaRevision一致、3 digest一致、全invariant成立時だけ生成できる。別HEAD、別corpus content、別mapping、別schema revisionへのreceipt再利用を拒否する。

## Input validation controls

| Input | Validation | Failure behavior |
| --- | --- | --- |
| repository root / corpus | canonical root、全relativePath+file digestの開始/終了一致 | sweep停止・全体再実行 |
| artifact path | allowlisted relative path、root containment、regular file | typed unreadable/disallowed artifact |
| runtime graph row | declared stage/produces、duplicateなし | mapping emission停止 |
| codekb re-scan | exact re-scans path、scan-only discriminator | statisticsには含め、runtime policyへ非投影 |
| sample identity | SHA-256 format、一意candidate対応 | collision failure |
| labels | 2 boolean + non-empty reason + approved role | group classification停止 |
| distance/statistics | finite non-negative values、canonical order | evidence invalid |
| mapping policy | unique lookup key、valid mode/searchScope | projection停止 |
| approval | schemaRevision + digest一致、READY invariant | handoff拒否 |

## Information exposure

authority artifactには再計算に必要なrelative path、line、normalized sample text、label理由、statisticsを保持する。absolute workspace path、環境変数、credential、file content全体は書き出さない。診断にはtyped reasonとrelative identityを使い、untrusted Markdownをshell commandやterminal control sequenceとして解釈しない。

本Unitはrepository内設計成果物を扱うため、新しいretention、backup、暗号化policyは追加しない。Git上の既存access/retention policyに従う。

## Dependency and execution controls

- Bun標準機能と既存framework helperだけを使い、新規runtime dependencyを追加しない。
- sweepはnetwork、AWS API、external registryを呼ばない。
- provenance commandを再実行しない。第1段は併記存在の分類だけを行う。
- child processを使う場合でも、固定されたrepository introspection commandに限定し、Markdown由来tokenをargvへ流さない。実装が直接Git/file APIで完結する場合はchild process自体を使わない。
- output先はactive intentのConstruction record内に固定し、任意path上書きを受け付けない。

## Threat and control matrix

| Threat | Control | Verification |
| --- | --- | --- |
| `..` / symlinkによるroot escape | canonical containment + regular-file check | allow/reject path fixtures |
| Markdown内command injection | command非実行、文字列scanのみ | adversarial backtick fixture |
| corpus途中変更 | start/end全catalog content digest照合 | dirty/untrackedの追加・削除・内容変更fixture |
| sample差替え/欠落 | deterministic identity + complete label validation | collision/missing-label fixture |
| mapping改ざん | authority/approval/projection digest chain | byte/集合drift test |
| stale approval再利用 | snapshot/mapping/schema binding | changed digest rejection |
| catastrophic regex backtracking | bounded matcher + adversarial performance test | 100KB linearity measurement |

## Security verification gates

Build and Testで次を独立に確認する。

1. allowlist内intent/codekb regular fileだけがcatalogへ入る。
2. absolute、URL、root escape、別intent、directory、missing targetを拒否する。
3. Markdown中のcommand/linkが実行・fetchされない。
4. Git/graph/predicate driftと、同一HEAD内のcatalog content drift、identity collision、label欠落、digest mismatchでapprovalしない。
5. SweepReport、Mapping、TypeScript projection、stage配線のdigest/意味集合が一致する。
6. 同一HEAD・predicate・labelsからbyte-equivalentなauthority artifactが得られる。

## Residual risk

- repository自体への書込権限を持つactorはcorpusとlabel候補を変更できる。対策はGit reviewとdigest-bound approvalであり、本Unit内に新しいidentity systemは作らない。
- 固定predicateは意味的な偽陰性を完全には除去しない。sample labelとmeasurement-only metricsで観測し、語彙変更は別requirements変更とする。
- local filesystem/runnerが侵害済みの場合、read-only validationだけでは信頼を回復できない。既存CI runner security boundaryの責任範囲である。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:44:57Z
- **Iteration:** 1
- **Scope decision:** none

absent-and-expectedの扱い、trust boundary、非該当範囲、cloud非依存は妥当。ただし、同一HEAD内のcorpus変更を検出できないsnapshot整合性と、schema revisionへのapproval bindingが実装可能な契約になっておらず、integrity chainを保証できない。

### Findings

- BLOCKER | security-design.md:56はsweep前後でGit SHA、graph revision、predicate revisionだけを比較する一方、同ファイル:96は`start/end snapshot digest照合`をcontrolとしている。HEADを変えずにdirty/untrackedなcorpus Markdownが途中変更された場合、現設計では変更を検出せず異なる入力の結果を承認できる。完了直前に実際のCorpusSnapshotまたは全catalog content digestを再計算して開始時digestと比較し、不一致時は必ず全体再実行する契約へ統一する必要がある。
- BLOCKER | security-design.md:33,60,99はapproval/consumerをschema revisionへbindingしてstale receiptを拒否するとしているが、MappingApproval必須フィールドにschema revisionがなく、mapping digestなどのcanonical payloadへschema revisionを含める定義もない。この形では別schema revisionへのreceipt再利用を確実に判定できない。schemaRevisionをreceiptの明示フィールドに追加するか、どのdigestへどう含めて検証するかを規定する必要がある。
- FOLLOW-UP | security-design.md:52の`有限number rendering`はbyte-equivalent検証に対する判定可能なcanonicalization契約として不足している。少なくとも負のゼロ、指数表記、整数・小数境界、丸め、非有限値の拒否を含む直列化規則または採用する既存標準を明記するとよい。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:46:35Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の両BLOCKERは解消済み。同一HEADでもdirty/untracked corpusの追加・削除・内容変更を開始時と完了直前の全catalog content digest再計算で検出し、不一致時は全体再実行する契約になった。MappingApprovalもschemaRevisionを必須フィールドおよびreceipt canonical payloadへ含め、snapshot・mapping・recomputationの各digestとともに照合するため、別schema revisionへのreceipt再利用を拒否できる。数値canonicalizationも整数または既約有理数へ限定され、旧FOLLOW-UPも解消されている。残存BLOCKERなし。

### Findings

- None
