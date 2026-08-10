# Logical Components — numeric-provenance-sensor-cli

唯一のpresent consume `business-logic-model.md` に記述された評価pipeline (`business-logic-model.md:5-20`) とmodule境界 (`business-logic-model.md:101-120`) を、単一tool module内のlogical componentへ割り当てる。NFR Requirements成果物はabsent-and-expectedである。

## Component inventory

| Logical component | Responsibility | State | Failure domain |
| --- | --- | --- | --- |
| CLI Adapter | flags、pre-read path containment、read/missing/unavailable変換、mapping validation、JSON output | invocation-local | startup + physical file boundary |
| Context Classifier | cutoff、exclusion、lightweight、mapping lookup | immutable input + mapping | typed skipped verdict |
| Region Scanner | fence/paragraph/list/table regionとclaims | evaluation-local | current artifact |
| Provenance Resolver | bounded/full-region evidence、relative link | evaluation-local + injected probes | current claim/artifact |
| Verdict Composer | findings/metrics/terminal state | immutable derived values | current artifact |
| Generated Mapping | mode/searchScope/produces projection | module-level readonly | process startup validation |
| Sensor Manifest | dispatcher command/severity/matches | build-time file | dispatcher discovery |

これらは別class/file/serviceを要求せず、`amadeus-sensor-numeric-provenance.ts` 内の凝集したfunction/value境界である。

## Dependency direction

```text
Existing dispatcher
  -> Sensor Manifest
  -> CLI Adapter
       -> validated Generated Mapping
       -> root-aware filesystem capabilities
       -> Context Classifier
       -> Region Scanner
       -> Provenance Resolver
       -> Verdict Composer
  -> existing audit persistence
```

ResolverはClassifierやAdapterへ逆依存せず、ScannerはMappingを読まない。Evaluatorはdispatcher、audit、runtime graph、networkを読まない。

## Failure domains and blast radius

### Invocation boundary

1process=1artifactであり、mutable stateは共有しない。Markdown固有のfailureは当該processに限定される。dispatcher/auditは既存componentであり、新規toolのfailureでschemaやstorageを変更しない。

### Mapping boundary

Mapping破損はprocess startup failureとなり、そのrevisionの全invocationへ影響し得るため、Adapterが最初にvalidateしてfail loudする。runtime fallbackやlast-known-good cacheを置かず、build/testでauthority driftを防ぐ。

### Filesystem boundary

CLI Adapterだけがoutput fileを読む。lexical/canonical project-root containment後、canonical targetを `O_NOFOLLOW` でopenし、descriptor `fstat` とpre/post device+inode一致を検証する。検証済み同一descriptorだけから読み、race/root escapeはread前にunavailable stateとしてEvaluatorへ渡す。Resolverはroot-aware closureを通じてrelative targetの存在/通常file factだけを得る。raw path traversal、directory enumeration、target content readを所有しない。

## NFR allocation

| Concern | Owning component | Control |
| --- | --- | --- |
| median/p95/linearity | Scanner + Resolver | single-pass/indexed region |
| regex availability | Scanner | fixed bounded patterns |
| path containment | Adapter-provided capabilities + Resolver | lexical then canonical boundary |
| output file containment | CLI Adapter | lexical/canonical + O_NOFOLLOW + descriptor fstat/device/inode binding |
| deterministic output | Verdict Composer | canonical finding/metric order |
| fail-open semantics | Context Classifier + Composer | typed skipped states |
| startup failure | CLI Adapter | flag/mapping/read validation |
| horizontal independence | process boundary | no shared mutable state |

## Shared resources

共有resourceはreadonly source code/Generated Mappingと既存dispatcherだけである。新規DB、queue、cache、lock file、daemon、AWS resourceはない。Generated Mappingは各process module load時に同じbytesを読み、runtime更新しない。

## Deployment and infrastructure bridge

deployment modelはframework tools/sensors treeへ埋め込まれる短命Bun executableである。Infrastructure Designへ渡すcloud componentは存在しない。U3 distributionがcore sourceを既存buildで配送treeへ投影し、delivery treeからfireする。

## Verification

- module public surfaceが `evaluateNumericProvenance`、`main`、`fail` の既存contractを保つ。
- evaluator testはdispatcher/audit/networkなしで実行できる。
- injected filesystem factsでrelative link正負caseを再現できる。
- 2 parallel invocationがshared mutable stateなしで同一結果を返す。
- mapping validation failureとbusiness verdictが別channelになる。
