# Domain Entities — workspace-inspection

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
ReadOnlyFs
  -> RootSignals
  -> ProjectCandidate[]
  -> SubmoduleObservation[]
  -> WorkspaceAdvisory[]
  -> WorkspaceScan
       -> intent birth/state projection
       -> detect JSON projection
       -> doctor projection
       -> WORKSPACE_SCANNED projection
```

`WorkspaceScanResult`はC3 Workspace Inspection Serviceのimmutable snapshotであり、consumerが個別にfilesystemを再解釈することを防ぐ。database entityや長寿命aggregateではなく、一回のCLI invocation内で生成・消費されるvalue graphである。

## WorkspaceScan

```ts
type ClassifiedWorkspaceScan = {
  root: string;
  projectType: "Greenfield" | "Brownfield";
  languages: readonly string[];
  frameworks: readonly string[];
  buildSystem?: string;
  nestedRoot?: string;
  nestedCandidates: readonly ProjectCandidate[];
  submodules: readonly SubmoduleObservation[];
  advisories: readonly WorkspaceAdvisory[];
};

type InconclusiveWorkspaceScan = {
  root: string;
  partial: PartialWorkspaceObservations;
  advisories: readonly BlockingWorkspaceAdvisory[];
};

type PartialWorkspaceObservations = {
  languages: readonly string[];
  frameworks: readonly string[];
  buildSystem?: string;
  nestedCandidates: readonly ProjectCandidate[];
  submodules: readonly SubmoduleObservation[];
};

type WorkspaceScanResult =
  | { kind: "classified"; scan: ClassifiedWorkspaceScan }
  | { kind: "inconclusive"; scan: InconclusiveWorkspaceScan };
```

- `root`はcallerが与えたworkspace rootの正規化済み絶対path。成果物やaudit payloadへ出すときは既存privacy/portability規則に従う。
- `projectType`はclassified variantにしか存在しない。inconclusiveをGreenfield/Brownfieldへcastするhelperは作らない。
- `nestedRoot`は唯一の候補が確定した場合だけ存在するrelative pathである。
- `nestedCandidates`はhit全件のsorted snapshotであり、複数候補時の選択結果ではない。
- `languages`と`frameworks`は観測値であり、未初期化submoduleから推定しない。
- 空配列は「観測対象なし」または「parse可能entryなし」を表す。理由が必要な場合は`advisories`と対にする。

`PartialWorkspaceObservations`はdiagnostic表示用であり、classification proofではない。birth/state projectorはこれをstate fieldへ投影できない。`WorkspaceScanResult`へのexhaustive matchにより、`inconclusive`を未処理のままcompileできない境界を作る。

## ProjectCandidate and RootSignals

```ts
type ProjectCandidate = {
  path: string;
  signals: RootSignals;
};

type RootSignals = {
  sourceCounts: Readonly<Record<string, number>>;
  frameworks: readonly string[];
  buildSystem?: string;
  manifests: readonly string[];
  sourceDirectories: readonly string[];
};
```

`ProjectCandidate.path`はworkspace rootからのdepth-1 relative pathで、絶対path・`..`・symlink targetを持たない。`RootSignals`は同じevaluatorをrootとcandidateで再利用するためのvalue objectであり、`isBrownfield`はsignal集合自身の振る舞いとして導出する。consumerがfieldを取り出して別々の判定式を複製しない。

候補のidentityはrelative pathである。二つの候補を名前やmanifest種別で勝手に同一視せず、sorted path順を決定性の正本とする。

## SubmoduleObservation

```ts
type SubmoduleObservation = {
  name: string;
  path: string;
  url?: string;
  initialized: boolean;
};
```

`name`は`.gitmodules` section名、`path`は安全性検証済みrelative path、`url`は表示用の任意metadataである。`initialized`は`root/path/.git` entryの観測結果であり、Git commandの実行結果ではない。

このentityはsubmoduleを管理しない。初期化、fetch、checkout、deinitのmethodを持たず、remedy実行は常に利用者の明示操作に委ねる。path safetyを通過したentryだけがentityになれるため、root外probeという無効状態を表現しない。

## WorkspaceAdvisory

```ts
type WorkspaceAdvisoryCode =
  | "MULTIPLE_NESTED_PROJECTS"
  | "UNREADABLE_ENTRY"
  | "UNPARSEABLE_GITMODULES"
  | "UNINITIALIZED_SUBMODULES"
  | "INCREMENTAL_SCOPE_GREENFIELD";

type BlockingWorkspaceAdvisoryCode =
  | "ROOT_UNREADABLE"
  | "SIGNAL_METADATA_UNREADABLE"
  | "CANDIDATE_UNREADABLE"
  | "UNPARSEABLE_GITMODULES";

type WorkspaceAdvisory = {
  code: WorkspaceAdvisoryCode;
  paths: readonly string[];
  message: string;
  remedy?: string;
};

type BlockingWorkspaceAdvisory = {
  code: BlockingWorkspaceAdvisoryCode;
  paths: readonly string[];
  message: string;
  remedy?: string;
};
```

advisoryはfailureを成功へ丸める型ではなく、分類を妨げない観測上の注意を伝えるvalue objectである。`paths`はsortedかつbounded表示前の全relative pathを保持し、各projectionが表示上限を適用する。remedyは説明だけであり、実行可能callbackやcommand invocationを持たない。

`BlockingWorkspaceAdvisory`はinconclusive variantだけが持ち、classification proofが欠けた理由を表す。非blockingな未初期化submoduleと、blockingな`.gitmodules` parse 0件を同じcodeへcollapseしない。birth/stateはblocking codeの個別列挙ではなくunion variantで拒否するため、新code追加時もguard漏れを起こさない。

## ReadOnlyFs port

```ts
type ReadOnlyFs = {
  readDirectory(path: string): Result<readonly DirectoryEntry[], FsObservationError>;
  readTextFile(path: string): Result<string, FsObservationError>;
  inspectEntry(path: string): Result<EntryKind, FsObservationError>;
};
```

C3のpure decision logicは`ReadOnlyFs` portだけに依存する。production adapterはNode/Bun filesystemへ薄く写像し、fixtureはerrorを注入できる。write、mkdir、spawn、Git mutation methodをportへ追加しない。この境界により、permission failureとsymlinkを本番分岐へtest専用modeなしで注入できる。

## Lifecycle and ownership

1. `ReadOnlyFs`がroot metadataを観測する。
2. `RootSignals`と`SubmoduleObservation`が検証済みvalueへparseされる。
3. rootが無信号のときだけ`ProjectCandidate` collectionを構築する。
4. 観測完全ならclassified、不完全ならinconclusiveとして`WorkspaceScanResult`へ閉じる。
5. birth/state、detect、doctor、audit projectorが同じsnapshotをexhaustive matchし、filesystemへ戻らない。
6. birth/stateはclassifiedだけをcommitし、inconclusiveでは全mutation前にtyped errorを返す。

正本ownerは`packages/framework/core/tools/amadeus-utility.ts`近傍のworkspace inspection seamである。6 harness配布物はgenerator経由のprojectionであり第二定義ではない。`dist/`を手編集せず、新規module分割は実装時の現行choke point確認で必要な最小単位に限る。

## Non-entities

- nested projectの自動selection policy、recursive repository crawler、Git submodule managerはU06に存在しない。
- frontend component、API resource、database row、AWS resource、network serviceは存在しない。
- doctor row、audit markdown、human warning文字列は`WorkspaceScan`のprojectionでありdomain ownerではない。

## Upstream input traceability

| Input | Entity設計への実質利用 |
|---|---|
| `unit-of-work.md` | `WorkspaceScan`と3公開seamをU06の所有境界として固定 |
| `unit-of-work-story-map.md` | U06のentityはFR-3 items 11–12だけを表し、U12 ledger entityを含めない |
| `requirements.md` | `ProjectCandidate`、`SubmoduleObservation`、`WorkspaceAdvisory`の必要状態を導出 |
| `components.md` | C3内のvalue graphと既存consumer projectionに限定し、別service aggregateを作らない |
| `component-methods.md` | `WorkspaceScan`、`ReadOnlyFs`、3関数の型境界を具体化 |
| `services.md` | invocation-local immutable snapshot、DB/network/UI entityなしを固定 |
