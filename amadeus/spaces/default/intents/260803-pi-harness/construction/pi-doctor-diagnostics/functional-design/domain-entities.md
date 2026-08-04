# pi-doctor-diagnostics — Domain Entities

## Modelling policy

doctor domainはimmutable observation、pure evaluator、structured reportで表す。Pi SDK typeをcoreへ漏らさず、Pi public trust/resource semanticsは`PiDoctorPorts`のadapterに閉じる。checkはrepair commandではなく事実とremediationを返す。

## Input, catalog, and snapshot

```ts
type PiDoctorInput = {
  projectRoot: string;
  nativeTrust?: { trusted: boolean; source: "pi-context" };
  output: "text" | "json";
};

type ExpectedPiResource = {
  resourceId: string;
  kind: "skill" | "extension" | "package-resource" | "driver";
  relativePath: string;
  required: boolean;
  sha256: string;
  contractId: string;
};
```

`TrustedExpectedPiDoctorCatalog`はschema version、harness=`pi`、framework distribution version、doctor contract version、minimum Pi/Bun SemVer、supported platforms、stable check IDs、expected resources、canonical payload digestを持つ。authored Pi harness manifest projectionからpackage時にcompileされ、実行中doctor moduleに埋め込んだexpected digestとexact matchする。target workspaceのmanifestはこの型を生成できない。

`TrustedCatalogObservation`は`verified(catalog) | missing | schema-mismatch | version-mismatch | digest-mismatch`である。verified以外ではresource evaluatorへempty/default catalogを渡さず、明示的なblocked dependencyを渡す。

`PiDoctorSnapshot`はrun ID、project identity digest、platform、executable observations、trust observation、resource observations、package route observationsを持つ。run ID/timestampはdiagnostic correlationだけに使い、normalized output比較から除外する。snapshotはdeep freezeし、rendererまで再読しない。

## Check identifiers and results

`PiCheckId`は以下のrequired closed setとcatalog extension setである。

- `pi.catalog`
- `pi.runtime.executable`
- `pi.runtime.version`
- `pi.runtime.platform`
- `pi.runtime.bun`
- `pi.project.trust`
- `pi.resource.skill.amadeus`
- `pi.resource.extension.lifecycle`
- `pi.resource.package`
- `pi.resource.driver.subagent`

```ts
type PiCheckResult = {
  id: PiCheckId;
  status: "pass" | "fail" | "unsupported" | "error" | "blocked-by" | "not-applicable";
  severity: "required" | "advisory";
  observed: RedactedObservation;
  expected: RedactedExpectation;
  failureCode?: PiDoctorFailureCode;
  dependency?: PiCheckId;
  remediation: readonly RemediationStep[];
};
```

`PiDoctorReport`はschema version、harness=`pi`、status、ordered checks、summary counts、exit codeを持つ。report constructorがstable ID uniqueness、required set completeness、blocked dependency存在、summary整合を検証する。不正なresult集合はhealthyを生成できない。

## Runtime observations

`ExecutableObservation`は`found | missing | unusable`で、foundはbasename、realpath digest、regular/executable、spawn receiptを持つ。absolute pathを持たない。

`VersionObservation`は`parsed(SemVer) | malformed(digest,length) | nonzero(exit) | timeout | blocked-by`である。stdout原文を保持せず、strict parserがcontrol/複数行を拒否する。

`PlatformObservation`はNode platform literalを`darwin | linux | win32 | other`へ閉じる。`BunObservation`もPiと独立したexecutable/version unionを使う。

`BoundedProcessReceipt`はexit、timeout、stdout/stderr digestとbyte countだけを持つ。spawn requestはexact executable、argv allowlist、neutral cwd、env key allowlist、closed stdin、deadline、output capを持つ。

## Trust observation

```ts
type PiTrustObservation =
  | { kind: "trusted"; source: "pi-context" | "saved" | "default-always"; relation: "exact" | "ancestor" | "runtime" }
  | { kind: "untrusted"; source: "pi-context" | "saved" | "default-never"; relation: "exact" | "ancestor" | "runtime" }
  | { kind: "unresolved"; source: "default-ask" | "default-absent" }
  | { kind: "unreadable"; source: "trust-store" | "settings"; errorCode: string };
```

`PiTrustStoreSnapshot`はcurrent projectへ適用されるclosest decisionだけをdomainへ渡し、他projectのpath/decisionを捨てる。native context factがある場合、storeはcurrent process判定に使わない。`--approve`の一時factはnative contextを通じてのみ表現する。

## Resource and package observations

`ResourceObservation`は`present | missing | unsafe | wrong-kind | hash-mismatch | contract-mismatch | unreadable`のclosed unionで、resource ID、project-relative path、expected/actual digest prefixを持つ。symlinkはpresent regular fileへfollowせずunsafeである。

`PackageRouteObservation`はroute=`setup | pi-local | pi-git`、target manifest version/status、normalized resource set digest、trusted catalogに対するmissing/extra/hash differencesを持つ。routeが存在しないことと、存在するが壊れていることを分ける。target manifestはexpected entryを定義せず、観測されたclaimとしてのみparseする。少なくとも1 install routeが必要で、present routeはすべてtrusted catalogと一致しなければならない。

`DriverContractObservation`はstatic entrypoint hash/contract IDと任意probe resultを持つ。probe resultは`not-run-bun-unavailable | valid | invalid | timeout`で、child/model/provider/sessionを生成しない。

## Remediation and redaction

`RemediationStep`はclosed IDとsafe parameterだけを持つ。主要IDは`install-pi | upgrade-pi | install-bun | use-supported-platform | review-and-trust-project | restart-pi-after-trust | reinstall-amadeus-pi | repair-package-route | restore-driver | inspect-relative-path`である。

`RedactedObservation`はboolean、SemVer、enum、count、digest prefix、basename、project-relative pathだけを許す。renderer境界でsecret pattern、HOME canonical prefix、control characterを再検査し、検出時はreport全体を`output-redaction-failed`でunhealthyにする。redaction failureを元value付きerrorへ変換しない。

## Ports and ownership

| Port | Operations | Must not own |
|---|---|---|
| `TrustedPiDoctorCatalogPort` | doctor-bound compiled catalogのloadとembedded digest/version検証 | target manifest由来expected set、fallback catalog |
| `ExecutableProbePort` | which/realpath digest、bounded exact spawn | shell interpolation、version judgment |
| `PlatformProbePort` | platform observation | compatibility policy |
| `PiTrustProbePort` | native factまたはclosest saved/default snapshot | prompt、remember、approve |
| `ResourceProbePort` | no-follow stat、hash、frontmatter/static contract parse | import/execute resource |
| `PackageManifestProbePort` | setup/local/git normalized manifest observation | install/update |
| `DriverDoctorProbePort` | static contract、optional offline bounded probe | child/model spawn |
| `PiDoctorRendererPort` | structured reportからtext/JSON | check judgment、exit decision |

`PiDoctorPorts`は上記をexplicit fieldで受け、service locatorやworkflow stateを読まない。各portは`ok | unavailable | invalid | failed`のclosed resultを返しthrowしない。adapter境界でnative exceptionをredacted failedへ変換する。

## Composition and lifecycle

`PiDoctorCheckCatalog`はPi check evaluatorだけを登録し、core dispatcherがharness identityにより選択する。common checkは`common.*` namespace、Pi checkは`pi.*` namespaceである。他harness catalogをPi runへunionしない。

doctor lifecycleは`resolve input → snapshot ports once → evaluate all → validate report → render once`で終了する。session、extension health、active intent、audit shardが存在しなくても実行できる。blocked extension内から呼ばれる場合も同じinputへnative trust factを追加するだけである。

## 上流トレーサビリティ

`unit-of-work`のcheck snapshot ownership、`unit-of-work-story-map`のdoctor/remediation journey、`requirements`のPi-only positive/negative criteria、`components`のPiDoctorChecks/core dispatch seam、`component-methods`の`PiDoctorReport`、`services`の短命read-only probeをdomain modelへ落とした。
