# Code Summary — U4 Operation Planning And Safety

## 実装ファイル

- `packages/setup/src/domain/plan-types.ts`
  - `FileOperationPlan`, `FileOperation`, `PlanningContext`, `InteractionMode`, no-write/confirmation/backup reason codes, backup path value types を追加した。
- `packages/setup/src/domain/backup-planner.ts`
  - UTC basic timestamp formatter と injected `backupPathExists` 前提の backup path builder を追加した。
- `packages/setup/src/domain/operation-planner.ts`
  - `planInstall`, `planUpgrade`, `validateFileOperationPlan` を実装し、install/upgrade の file classification、collision policy、version no-write policy、plan invariant validation を集約した。
- `packages/setup/src/application/setup-service.ts`
  - U2 source load と U3 detection/snapshot の後に U4 planning を接続し、plan summary を `downstream-not-implemented` diagnostics に含めて U5 apply/manifest 前で停止する。
- `tests/unit/t206-setup-operation-planning.test.ts`
  - install planning、upgrade planning、backup/invariant の U4 焦点テストを追加した。
- `tests/unit/t205-setup-target-state.test.ts`
  - service boundary 期待を plan 作成後停止に更新した。

## 判断

- source metadata class を優先し、`user-preserved` は常に skip とした。
- shared file は snapshot md5 と previous manifest/source md5 を比較し、changed/unknown の場合は backup 先行、non-interactive collision は conflict-only no-write とした。
- `--yes` は confirmation を抑止するが validation は抑止しない。`--force` は collision prompt を bypass するが backup は bypass しない。
- upgrade は target state と version policy を file planning より先に評価し、`none` / `unsupported-layout` / `ambiguous-harness` / `partial` without force / already-up-to-date / downgrade / installed-newer-than-latest を no-write とした。
- planner は live filesystem を直接読まず、U3 snapshot と injected `backupPathExists` のみを使う。
- 1 plan あたり 1 つの UTC basic timestamp を複数 backup candidate で共有する。

## テスト

- install planning:
  - clean add
  - user-preserved skip
  - shared unchanged update
  - shared changed non-interactive collision no-write
  - interactive confirmation plan
  - `--yes --force` backup before force-update
- upgrade planning:
  - target none
  - unsupported layout
  - ambiguous harness
  - partial no-force
  - partial force conservative plan
  - already-up-to-date
  - downgrade unsupported
  - installed-newer-than-latest
  - newer explicit upgrade
- backup/invariants:
  - UTC basic timestamp
  - collision suffixes
  - one timestamp for multiple backups
  - `backupPathExists` only for backup candidates
  - conflict not executable
  - sourcePath/sourceMd5 on copy operations
- service boundary:
  - source/detect/snapshot/plan 後に apply 前停止
  - stderr に planned operations summary

## 逸脱

- U5 file apply、backup write、prompt handling、manifest write、post-install verification、CI/release/docs、legacy `core/` / `harness/` compatibility は実装していない。
