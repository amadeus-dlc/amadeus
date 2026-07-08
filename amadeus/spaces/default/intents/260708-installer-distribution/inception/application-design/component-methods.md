# Component Methods — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: application-design (2.6) / 作成: 2026-07-08(Rev.2 同日 — ユーザー指摘によりドメイン型を振る舞い持ちへ改訂。Tell, Don't Ask+`functional-domain-modeling-ts` スタイル採用、project.md Code Style 参照)
> 上流入力: `../requirements-analysis/requirements.md`、`components.md`。詳細な業務ルールは functional-design で確定する(ここは公開 API の形のみ)

## スタイル規約(Rev.2)

- ドメイン型は type+同名 namespace のコンパニオンオブジェクトで振る舞いを持つ(class 不使用、`Object.freeze`)。判断はデータの持ち主に置き、呼び出し側は状態を取り出して分岐しない
- ステートフルなモジュール(resolver/fetcher 等)はファクトリ関数+クロージャで生成し、ポート(Http/FsOps/TtyIO)はファクトリ引数で注入する
- 失敗しうる操作は判別ユニオンの `Result<T, E>` を返す。エラー型もコンパニオンファクトリを持つ
- 各ドメイン型の振る舞いの正準定義は `construction/setup-foundation/functional-design/domain-entities.md`(Rev.2)を参照

## 公開 API シグネチャ(モジュール別)

### cli

```ts
main(argv: string[]): Promise<number>                        // エントリポイント。終了コードを返す
parseArgs(argv: string[]): ParsedCommand | UsageError        // install/upgrade/help とフラグの解析
runWizard(missing: MissingInputs, io: TtyIO): Promise<WizardAnswers>  // 対話ウィザード(TTY 限定)
```

- エラー方針: `UsageError` は型付きの値として返し(Parse, Don't Validate)、cli が使用方法+非ゼロ終了に変換

### resolver

```ts
createResolver(http: Http): Resolver                          // ファクトリ+クロージャ(ポート注入)
Resolver.resolve(spec: VersionSpec): Promise<Result<ResolvedVersion, ResolveError>>
// バージョン知識は SemVer/VersionSpec コンパニオンが所有:
//   SemVer.parse(raw): Result<SemVer, VersionError>          — スマートコンストラクタ(BR-F05)
//   SemVer.latestStableOf(list): SemVer | undefined          — 最新安定の選定(BR-F01〜F03)
//   VersionSpec.admits(spec, candidate): boolean             — プレリリース規則込みの適合判定(BR-F04)
```

- エラー方針: `no-stable-version` / `not-found` は `ResolveError`(判別ユニオン+コンパニオンファクトリ)として返す(回復不能 → cli がフェイルファスト)

### fetcher

```ts
createFetcher(http: Http): Fetcher
Fetcher.fetchArchive(version: ResolvedVersion, tmpDir: string): Promise<Result<ExtractedPayload, FetchError>>
// リトライ判断は FetchError.isTransient が所有(BR-F06/F07)。URL 構築は ResolvedVersion.archiveUrl(ADR-003)
// 展開検証(payload-invalid)は ExtractedPayload.locate に内包(BR-F10)
```

### planner

```ts
detectInstallation(target: string, manifestIo: ManifestIo): Installation
// Installation = { kind: "none" } | { kind: "manifested", manifest } | { kind: "manual-or-unknown", evidence } | { kind: "partial", missing }
planInstall(payload: ExtractedPayload, target: string, opts: PlanOptions): Plan | PlanRefusal
planUpgrade(payload: ExtractedPayload, installation: Installation, opts: PlanOptions): Plan | PlanRefusal
// Plan = { entries: PlanEntry[], backupTimestamp: string, summary }
// PlanEntry = { path, action: "add"|"update"|"skip"|"backup"|"conflict", class: FileClass, forced: boolean }
// PlanRefusal = 導入済み検出(install)、ダウングレード、already-up-to-date 等の型付き拒否(FR-004/005 境界)
```

- 純粋方針: planner は書き込みをせず、判定材料(md5 照合結果)をエントリに埋め込む

### applier

```ts
apply(plan: Plan, target: string, fsops: FsOps): Promise<ApplyResult>
// backup 先: `${path}.${plan.backupTimestamp}.bk`(FR-008、単一タイムスタンプ)
// ApplyResult = { applied: PlanEntry[], backups: string[], failures: ApplyFailure[] }
```

### manifest

```ts
createManifestIo(fsops: FsOps): ManifestIo
ManifestIo.read(target: string): Promise<Result<Manifest | null, ManifestError>>   // ok(null) = 不在(未導入/手動導入)
ManifestIo.write(target: string, manifest: Manifest): Promise<Result<void, ManifestError>>
// ドメイン振る舞いは Manifest コンパニオンが所有(FR-016):
//   Manifest.parse(json): Result<Manifest, ManifestError>       — schemaVersion 検査込み(BR-F12)
//   Manifest.build(payload, files, meta): Manifest
//   Manifest.dispositionFor(m, path, actualMd5): Disposition    — FR-008 の処遇判定(Tell, Don't Ask の中核)
//   Manifest.isNewerThan(m, candidate): boolean                 — バージョン境界判定(US-B4)
//   ManifestFiles(first-class collection).requiredPaths / dispositionFor / fromEntries
```

### verifier

```ts
verify(target: string, manifest: Manifest): VerifyResult
// 必須ファイル存在 + doctor 相当チェック(FR-013)。VerifyResult = { ok, checks: Check[] }
```

### reporter

```ts
renderPlanReport(plan: Plan): string          // 5分類のファイル一覧(FR-007)、force 印つき(FR-009)
renderError(err: ClassifiedError): string     // 原因分類と再実行案内(FR-012)
renderSuccess(result: ApplyResult, verify: VerifyResult, next: NextSteps): string  // US-A6
```

## エラーハンドリング方針(横断)

- 回復可能性で分類(construction フェーズルール): 一時的ネットワーク=リトライ(fetcher 内)、契約違反・境界拒否=型付きエラー値で返し cli がフェイルファスト
- 例外はモジュール境界を越えない — 統合境界(HTTP、ファイル I/O)で捕捉し型付きエラーに変換(Parse, Don't Validate / Result 志向)
- テストシーム: `Http`、`FsOps`、`TtyIO`、`ManifestIo` は依存注入ポート。fake はテスト側ヘルパーに置く(本番コードにテスト分岐を置かない)
