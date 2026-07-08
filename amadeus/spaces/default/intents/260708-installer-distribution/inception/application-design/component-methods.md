# Component Methods — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: application-design (2.6) / 作成: 2026-07-08
> 上流入力: `../requirements-analysis/requirements.md`、`components.md`。詳細な業務ルールは functional-design で確定する(ここは公開 API の形のみ)

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
resolveVersion(spec: VersionSpec, http: Http): Promise<ResolvedVersion | ResolveError>
// VersionSpec = { kind: "latest" } | { kind: "exact", raw: string }
// ResolvedVersion = { tag: `v${string}`, semver: SemVer, source: "release" | "tag" }
compareSemver(a: SemVer, b: SemVer): -1 | 0 | 1              // SemVer 順序(辞書順禁止、FR-006)
```

- エラー方針: `no-stable-version` / `not-found` は ResolveError として返す(回復不能 → cli がフェイルファスト)

### fetcher

```ts
fetchArchive(version: ResolvedVersion, http: Http, tmpDir: string): Promise<ExtractedPayload | FetchError>
// 内部で1回リトライ(FR-012)。FetchError = { kind: "dns" | "conn" | "http" | "rate-limit", detail, retryHint }
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
readManifest(target: string): Manifest | null | ManifestError      // null = 不在(未導入/手動導入)
writeManifest(target: string, manifest: Manifest): Promise<void>
buildManifest(payload: ExtractedPayload, applied: ApplyResult, meta: InstallMeta): Manifest
// Manifest スキーマ: FR-016(schemaVersion, installerPackageVersion, distributionVersion, sourceTag, installedAt, harness, files[])
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
