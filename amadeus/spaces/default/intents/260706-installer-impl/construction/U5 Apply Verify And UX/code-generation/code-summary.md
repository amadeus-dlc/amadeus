# Code Summary — U5 Apply Verify And UX

## 実装ファイル

- `packages/setup/src/domain/apply-types.ts`
  - `ApplyResult`, `ApplyDecision`, `VerificationResult`, `SetupResult`, `ManifestWriteStatus` を追加した。
- `packages/setup/src/domain/harness-paths.ts`
  - harness engine/tools directory と active-space memory shell の readiness path を定義した。
- `packages/setup/src/domain/file-applier.ts`
  - `applyPlan` を実装し、plan order 通りの backup/copy 実行、`skip`/`conflict` no-op、`canApply:false` 拒否を追加した。
- `packages/setup/src/domain/manifest-builder.ts`
  - `buildInstallerManifest` と `writeManifest` を追加した。
- `packages/setup/src/domain/verifier.ts`
  - `verifyInstallation` を実装し、manifest required entries と doctor-equivalent readiness checks を追加した。
- `packages/setup/src/ports/filesystem.ts`
  - `TargetFilePort` を追加した。
- `packages/setup/src/ports/manifest-store.ts`
  - `ManifestStorePort` を追加した。
- `packages/setup/src/adapters/target-file.ts`
  - Node filesystem 向け copy/backup/atomic write adapter を追加した。
- `packages/setup/src/adapters/manifest-store.ts`
  - atomic manifest write adapter と test 用 failing store を追加した。
- `packages/setup/src/cli/reporter.ts`
  - `renderPlan`, `renderResult`, no-write reason/next-action helper を追加した。
- `packages/setup/src/ports/target-state.ts`
  - `PromptPort` に `chooseTarget` と `confirmApply` を追加した。
- `packages/setup/src/cli/types.ts`
  - `SetupError` に apply/manifest/verification/no-write code を追加し、`noFilesModified` を boolean 化した。
- `packages/setup/src/application/setup-service.ts`
  - plan -> render -> confirm -> apply -> manifest -> verify -> result の end-to-end orchestration を接続し、`downstream-not-implemented` stop を削除した。
- `tests/unit/t207-setup-apply-verify-ux.test.ts`
  - BR-U5-001〜BR-U5-023 の testable invariants を fake port で検証する U5 焦点テストを追加した。
- `tests/unit/t205-setup-target-state.test.ts`
  - service boundary 期待を apply/manifest/verify 完了に更新し、writable fake port を拡張した。

## 判断

- U5 は U4 `FileOperationPlan` を唯一の mutation contract として扱い、policy 再計算は行わない。
- `canApply:false`、declined confirmation、prompt disallowed では File Applier / Manifest Store を呼ばない。
- manifest write は apply success 後のみ開始し、failure は `manifest-write-failed` として applied operations を報告する。
- verification は manifest required entries と固定 readiness paths の existence check のみを行い、fresh install の state/intent 不在は失敗にしない。
- Reporter は `FileOperationPlan` から `Operation` / `Files` / `Example` 列を生成し、backup path と force marker を表示する。

## テスト

- file applier:
  - plan order 実行
  - `canApply:false` 拒否
  - `conflict` no-op
  - backup failure で manifest `not-started`
  - copy failure の partial diagnostics
- reporter:
  - stable plan table columns
  - classified error の no-change guarantee と next action
  - backup path の final result 表示
- manifest/verification:
  - manifest builder
  - readiness path checks
  - failed check names
  - state/intent absence tolerance
- service orchestration:
  - declined confirmation no-write
  - `--yes` collision no-write
  - `--force` backup before force-update
  - manifest write failure non-zero with applied files
  - verification failure non-zero with failed check names
  - prompt suppression under `--yes`
  - planner/reporter integration for force plan

## 逸脱

- U6 integration harness、CI/release/docs、rollback restore、legacy `core/` / `harness/` compatibility は実装していない。
- `chooseTarget` は PromptPort contract として追加したが、現行 CLI は `--target` 必須のため service では未使用。
