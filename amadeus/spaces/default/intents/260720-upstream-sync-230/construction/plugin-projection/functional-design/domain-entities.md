# Domain Entities — plugin-projection

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
PluginSource[] -> C1 validation gate
       + HarnessManifest[]
       -> ProjectionPlan
       -> PluginBundle[] + HarnessProjection[]
       -> BuildResult
       -> Drift[]
       -> SelfInstallProjection[closed 4]
```

これらはC5のbuild invocation内だけで生存するimmutable value graphである。database aggregateやruntime plugin registryではない。`plugins/<name>/`だけがauthoring正本で、bundle、harness projection、self-install projectionは導出物である。

## PluginSource

```ts
type PluginSource = {
  sourceRoot: string;
  directoryName: string;
  manifestBytes: Uint8Array;
  artifacts: readonly SourceArtifact[];
};
```

`PluginSource`はread-only discovery結果である。C1 validationはprojection前の必須処理だが、E-OC1再裁定Aに従って公開signature上の型を別の`ValidPluginSource`へ変更しない。`buildPluginProjection`と`buildHarnessTree`は`component-methods.md`どおり`PluginSource`を受け取る。

## HarnessManifest and harness sets

```ts
type PackageHarness =
  | "claude"
  | "codex"
  | "cursor"
  | "kiro"
  | "kiro-ide"
  | "opencode";

type SelfInstallHarness = "claude" | "codex" | "cursor" | "opencode";

type HarnessProjectionTarget = {
  name: PackageHarness;
  manifest: HarnessManifest;
  distRoot: string;
};
```

`PackageHarness`は現行のmanifest discovery結果を説明する6面集合であり、packager実装の正本はhardcoded unionではなく`harness/<name>/manifest.ts` discoveryである。一方、`SelfInstallHarness`は意図的なclosed unionで、kiro系をproject-local installへ暗黙追加させない型境界である。

`HarnessManifest`は既存core/harness projectionのpath、token、rules rename、frontmatter、emit規則のownerである。plugin entityはharness固有path規則を複製せず、このmanifestへ委譲する。

## ProjectionPlan and projected artifacts

```ts
type ProjectionPlan = {
  plugins: readonly PluginSource[];
  harnesses: readonly HarnessProjectionTarget[];
  bundles: readonly PluginBundle[];
  hostArtifacts: readonly ProjectedArtifact[];
  expectedPaths: ReadonlySet<string>;
};

type PluginBundle = {
  plugin: PluginName;
  root: string;
  artifacts: readonly ProjectedArtifact[];
};

type ProjectedArtifact = {
  owner: PluginName | "core" | "harness";
  harness?: PackageHarness;
  relativePath: string;
  bytes: Uint8Array;
  sourcePath: string;
};
```

`ProjectionPlan`は全plugin validationとpath collision検査後にだけ存在する。`expectedPaths`はorphan判定とwrite-mode sweepの共通正本であり、checkとwriteが別々のownership計算を持たない。

`PluginBundle`は`dist/plugins/<name>/`へ投影されるharness-neutral bundleで、U10のcomposition inputになる。`ProjectedArtifact`は生成先別のvalueであり、host filesystem上の既存fileを直接所有しない。二つのartifactが同一`relativePath`を所有する状態はplan生成時に拒否する。

## BuildResult and Drift

```ts
type BuildResult = {
  expectedPaths: ReadonlySet<string>;
  readSources: ReadonlySet<string>;
  outsideHarness: readonly string[];
};

type DriftKind = "MISSING" | "DIFFERS" | "ORPHAN" | "UNREFERENCED";

type Drift = {
  kind: DriftKind;
  harness?: PackageHarness;
  path: string;
  plugin?: PluginName;
};
```

`BuildResult`はgenerated treeそのものではなく、生成と検査が共有するownership/read evidenceである。`Drift`はcheck modeのdiagnostic valueで、filesystem mutation methodを持たない。順序はharness、kind、pathでcanonicalに決める。

MISSINGとDIFFERSは期待側からcommitted側への比較、ORPHANはcommitted側から期待側への比較、UNREFERENCEDはsource discovery集合からread-setへの比較で導出する。これにより、生成漏れ、手編集、削除残骸、死んだsourceを別状態として扱う。

## Lifecycle and ownership

1. `PluginSource`をread-onlyでdiscoverする。
2. C1 contractで全`PluginSource`をvalidateする。一件でも失敗すればlifecycle終了でwrite 0。validationは公開型を別型へ置換しない。
3. plugin/harness/artifactをcanonical sortし、collision-freeな`ProjectionPlan`を作る。
4. temp rootへ`PluginBundle`と6面`ProjectedArtifact`を生成し、`BuildResult`を得る。
5. check modeは`Drift`を返すだけ、write modeはexpected ownership内だけclean-sweepしてcommitする。
6. self-installは`SelfInstallHarness`の4面だけをgenerated distからproject rootへ反映する。

U09のentityはcomposition recordやhost plugin installation lifecycleを持たない。U10がbundleを消費してhost transactionを所有し、U11がreference source、U12がledger evidenceを所有する。

公開関数は`discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`の4つである。`buildSelfInstallProjection`は`SelfInstallHarness`のclosed unionを消費するC5内部helperであり、domainの追加public seamではない。

## Non-entities

- marketplace entry、lockfile、remote registry、download credentialは存在しない。
- agent/scope/memory/knowledge projection、`when` evaluatorは本intentのdeferred面である。
- frontend component、API resource、database row、AWS resourceは存在しない。
- `dist/` fileはauthoring entityではなくC5のgenerated representationである。

## Upstream input traceability

| Input | Entity設計への実質利用 |
|---|---|
| `unit-of-work.md` | 4公開seamとU09/U10/U11 ownershipからvalue graphを導出 |
| `unit-of-work-story-map.md` | item 19だけをU09 entityへ閉じ、reference/e2e/ledger entityを除外 |
| `requirements.md` | source/host/dist境界、6/4集合、4 drift kind、0-plugin互換を型へ反映 |
| `components.md` | C5のgenerator-only ownershipと既存packager manifest再利用を固定 |
| `component-methods.md` | `PluginSource`、`ProjectionResult`、`BuildResult`、harness型の関数境界を具体化 |
| `services.md` | build-time invocation-local lifecycleと、DB/network/runtime service不在を固定 |
