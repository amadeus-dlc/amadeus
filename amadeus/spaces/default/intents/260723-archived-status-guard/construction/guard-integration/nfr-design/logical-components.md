# Logical Components — guard-integration

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`を入口・domain・検証componentへ割り当てる。

## Component inventory

| Component | Responsibility | Failure domain |
|---|---|---|
| `RegistryPathBoundary` (external: status-registry) | canonical workspace containment証明 | traversal/symlink/path drift |
| `LifecycleLockAuthority` (external: lifecycle-transaction) | lock context発行・失効・検証 | concurrent/unlocked access |
| `LifecyclePreflight` (external: lifecycle-transaction) | journal recovery、raw registry snapshot/version提供 | corrupt/incomplete transaction |
| `IntentStatusParser` (external: status-registry) | unknown statusをstrict 4値へ昇格 | malformed/unknown status |
| `IntentSelectorResolver` | name/record-dirを一意identityへ解決 | missing/ambiguous target |
| `ArchivedIntentGuard` | validated statusからtyped rejection | archived status |
| `LifecycleDelegationAdapter` | utility lock解放後のstate subprocess、stream/exit透過 | spawn/TOCTOU/child failure |
| `SelectGuardAdapter` | rejectionをnon-zero selector errorへ変換 | cursor bypass |
| `NextGuardAdapter` | rejectionをErrorDirectiveへ変換・即return | stage fall-through |
| `UnparkGuardAdapter` | rejectionをnon-zero unpark errorへ変換 | marker/status mutation |
| `GuardCorpusAnalyzer` | sinkとguard/capability pathを証明 | unresolved/dynamic path |
| `GuardBenchmark` | latency、RSS、concurrency、growth gate | provenance mismatch |

## Dependency direction

- public入口 → external lock authority/preflight → resolver → external path boundary → external status parser → archived guard → operation adapter。
- external preflightの出力は`{ context, registrySnapshot, snapshotVersion }`だけである。同じcallback内でresolverがsnapshot entryを選び、path boundaryとstatus parserが`{ dirName, containedPath, status: IntentStatus }`を構築する。guardはこのvalidated intent以外を受けない。
- callback中にregistryを再読込せず、snapshotVersion不一致はtyped stale-snapshot errorとして入口へ伝播する。本Unitではretryしない。
- adapterは既存public output shapeだけを所有し、status判定やresolver logicを複製しない。
- archived guardはcursor、marker、audit、stage graphへ依存せず、typed dataだけを返す。
- archive/unarchive utilityはresolver完了後にexternal contextを失効させ、`LifecycleDelegationAdapter`へverb+dirNameだけを渡す。state childがexternal componentsを新規取得して再検証する。
- corpus analyzer/benchmarkはproduction sourceと入口を観測するが、production componentは検査componentへ依存しない。

## Corpus proof

- source rootはcore toolsのTypeScriptで、sinkはcursor write/delete、stage directive開始、unpark marker mutation、registry status write。
- named import、re-export、direct wrapperをsymbol解決し、public CLI rootまで逆向きに辿る。
- computed property、dynamic import、解決不能alias、未分類sinkは検査失敗にする。
- 6 harnessとself-installはcoreから生成し、drift guardと禁止旧pattern scanで同期する。

## Shared resources

- workspace lock、registry、cursor、state、marker、audit、journalだけが共有資源である。
- database、queue、cache、daemon、external telemetry、cloud infrastructureは追加しない。
