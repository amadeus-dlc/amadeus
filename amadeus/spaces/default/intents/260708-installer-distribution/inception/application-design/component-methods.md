# Component Methods — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: application-design (2.6) / 作成: 2026-07-08(Rev.3 同日 — ユーザー確認済みの役割分担へ改訂: type はインスタンスメソッドを含む契約、コンパニオンは static 相当のみ。Tell, Don't Ask+`functional-domain-modeling-ts`、project.md Code Style 参照)
> 上流入力: `../requirements-analysis/requirements.md`、`components.md`。詳細な業務ルールは functional-design で確定する(ここは公開 API の形のみ)

## スタイル規約(Rev.3、ユーザー確認済み)

- **type はメソッドシグネチャを持つ契約**: ドメインオブジェクトのインスタンスメソッドが判断を所有する(`manifest.dispositionFor(path, md5)`)。実装は内部ファクトリ+クロージャが `Object.freeze` したリテラルで返す(class 不使用)
- **コンパニオン namespace は static 相当のみ**: スマートコンストラクタ(`parse`)・ファクトリ(`build`)・コレクションレベル演算(`latestStableOf`)。インスタンスを第一引数に取る振る舞い関数を置かない
- モジュール(resolver/fetcher/manifest-io)はファクトリ関数+クロージャで生成し、ポート(Http/FsOps/TtyIO)を注入する
- 失敗しうる操作は判別ユニオンの `Result<T, E>`。エラーもコンパニオンファクトリで生成し、所有すべき振る舞い(`isTransient()`)はインスタンスメソッドで持つ
- 各ドメイン型の正準定義は `construction/setup-foundation/functional-design/domain-entities.md`(Rev.3)を参照

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
resolver.resolve(spec: VersionSpec): Promise<Result<ResolvedVersion, ResolveError>>   // インスタンスメソッド(resolver = createResolver(http) の戻り値)
// static(コンパニオン): SemVer.parse(raw) — スマートコンストラクタ(BR-F05)
//                          SemVer.latestStableOf(list) — コレクションレベル演算(BR-F01〜F03)
// インスタンス: semver.isStable() / semver.isLaterThan(other)(BR-F02/F03)
//               spec.admits(candidate) — プレリリース規則込みの適合判定(BR-F04)
```

- エラー方針: `no-stable-version` / `not-found` は `ResolveError`(判別ユニオン+コンパニオンファクトリ)として返す(回復不能 → cli がフェイルファスト)

### fetcher

```ts
createFetcher(http: Http): Fetcher   // ※U1 nfr-design(logical-components)がポート分割版 createFetcher(http, tmpWrite) へ置換(TmpWrite 限定が REL-F01/SEC-F03 の構造保証)
fetcher.fetchArchive(version: ResolvedVersion, tmpDir: string): Promise<Result<ExtractedPayload, FetchError>>   // インスタンスメソッド
// リトライ判断はインスタンスメソッド err.isTransient() が所有(BR-F06/F07)。URL 構築は resolved.archiveUrl()(ADR-003)
// 展開検証(payload-invalid)は ExtractedPayload.locate(コンパニオン static)に内包(BR-F10)
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
apply(plan: Plan, target: string, fsops: FsOps): Promise<ApplyResult>   // ※U2 functional-design が Applier.create ファクトリ形へ、さらに U2 nfr-design が Applier.create(fsWrite) へ置換(SEC-I01/REL-I01 の構造保証)
// backup 先: `${path}.${plan.backupTimestamp}.bk`(FR-008、単一タイムスタンプ)
// ApplyResult = { applied: PlanEntry[], backups: string[], failures: ApplyFailure[] }
```

### manifest

```ts
createManifestIo(fsops: FsOps): ManifestIo   // ※U1 nfr-design(logical-components)がポート分割版 createManifestIo(fsRead, fsWrite) へ置換(読み書き分離が REL-F01 の構造保証)
manifestIo.read(target: string): Promise<Result<Manifest | null, ManifestError>>   // インスタンスメソッド。ok(null) = 不在(未導入/手動導入)
manifestIo.write(target: string, manifest: Manifest): Promise<Result<void, ManifestError>>
// static(コンパニオン): Manifest.parse(json) — schemaVersion 検査込み(BR-F12)
//                          Manifest.build(payload, files, meta)、ManifestFiles.fromEntries(entries)
// インスタンス(FR-016): manifest.dispositionFor(path, actualMd5): Disposition — FR-008 の処遇判定(Tell, Don't Ask の中核)
//                         manifest.isNewerThan(candidate) — バージョン境界判定(US-B4)
//                         manifest.requiredPaths() / manifest.upgradedTo(next) / manifest.toJSON()
//                         ManifestFiles は first-class collection(requiredPaths()/dispositionFor() をインスタンスで所有)
```

### verifier

```ts
verify(target: string, manifest: Manifest): VerifyResult   // ※U2 functional-design が Verifier.create ファクトリ形へ、さらに U2 nfr-design が Verifier.create(fsRead) へ置換(読み取り専用の構造化)
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
