# Code Summary — U3 Target State And Manifest

## 実装ファイル

- `packages/setup/src/domain/target-types.ts`
  - `InstallerManifest`, `TargetDetection`, `TargetSnapshot`, `SentinelSet`, `ManifestReadResult`, diagnostics payloads, validation issue classifications を追加した。
- `packages/setup/src/ports/target-state.ts`
  - U3用の読み取り専用portとして `TargetManifestReadPort`, `TargetReadOnlyFilePort`, optional `PromptPort` を追加した。
- `packages/setup/src/domain/manifest-schema.ts`
  - manifest schema version、package/source/version fields、ISO timestamp、harness、`files[]` の path/class/required/md5 を検証する。
- `packages/setup/src/adapters/target-readonly-file.ts`
  - Node filesystem向けの read-only `exists`, `readFile`, `md5` adapterを追加した。
- `packages/setup/src/adapters/target-manifest-reader.ts`
  - 固定manifest path `amadeus/.installer/amadeus-setup-manifest.json` を読み、absent/invalid/unreadable/valid diagnosticsを返すadapterを追加した。
- `packages/setup/src/domain/target-detector.ts`
  - manifest-first target detection、固定sentinel分類、`kiro` / `kiro-ide` ambiguity prompt解決、no-write mismatch errorを実装した。
- `packages/setup/src/domain/target-snapshot.ts`
  - distribution metadata と valid manifest context の expected pathsだけを読み、存在/md5/unknown md5 diagnosticsを生成するsnapshot builderを実装した。
- `packages/setup/src/application/setup-service.ts`
  - U2 source loadとU3 detection/snapshotを接続し、U4/U5 planning/apply前に `downstream-not-implemented` で停止する。
- `packages/setup/src/cli/types.ts`
  - U3 no-write error codesを追加した。
- `tests/unit/t205-setup-target-state.test.ts`
  - manifest、sentinel、snapshot、service boundaryのU3焦点テストを追加した。
- `tests/unit/t202-setup-package-shell.test.ts`
  - U3追加により、harness未指定targetの期待を「推定不能 no-write」に更新した。

## 判断

- valid manifest は sentinel より優先し、requested harness mismatch は `target-harness-mismatch` の no-write error とした。
- manifest absent/invalid/unreadable は `manifest-installed` にせず、diagnosticsを保持してsentinel fallbackへ進める。
- no requested harnessでU2 source loadにharnessが必要なため、targetがある場合だけU2前に読み取り専用検出でharnessを推定する。harness supplied時はU2後に検出・snapshotを行う。
- unsupported layout detection は初回リリースsentinel surfaceに限定し、`amadeus/` 単独のような supported harness sentinel 不足を `unsupported-layout` とした。
- `core/` と `harness/` は検出・互換・symlink推奨の対象にしない。テストでそれらのpathを読まないことを明示した。

## テスト

- manifest:
  - valid manifest installed/inference
  - requested harness mismatch no-write
  - invalid manifest fallback
  - unreadable manifest diagnostics
  - unsafe manifest file path rejection
- sentinel:
  - full/manual inference
  - partial
  - none
  - unsupported layout
  - non-interactive `kiro` / `kiro-ide` ambiguity
  - prompt-resolved ambiguity
  - `core/` / `harness/` backward compatibility prevention
- snapshot/service:
  - expected-path-only reads
  - readable md5
  - unreadable md5 omission
  - manifest context expected path union
  - service stops before planning/apply

## 逸脱

- U4 operation planning、U5 apply/manifest writing、CI/release/docs、legacy `core/` / `harness/` compatibility は実装していない。
- symlink作成・追跡・推奨は追加していない。
