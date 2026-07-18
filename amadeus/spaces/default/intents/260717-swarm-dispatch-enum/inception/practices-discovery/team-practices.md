# Team Practices — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`。

## Way of Working

私たちは `main` を中心に、短命branchからPull Request経由で変更を取り込み、Boltはsquashして線形履歴を保つ。AIはmain mergeや不可逆な外部操作を行わず、人間の明示承認へhandoffする。

## Walking Skeleton

私たちはgreenfieldの最初のConstruction Boltを小さなend-to-end sliceとして確認し、greenfield要素のない既存契約への加算ではceremonyを比例縮小する。本intentは既存swarm契約への三値enum拡張であり新パッケージ・新配布経路を持たないため、Bolt構成と先行スライスの要否はdelivery-planningで確定する。

## Testing Posture

私たちはTypeScriptのテストを `tests/` 配下へ置き、Bun runnerでunit / integration / e2e / smokeを検証する。コードと並行してテストを作成し、typecheck、Biome lint、complexity、dist / self-install drift、test、coverage(patch gateを含む)の既存CI gateをgreenに保つ。

## Deployment

私たちはapplication deploy基盤を持たず、releaseは `.github/workflows/release.yml` の手動 `workflow_dispatch` からrelease-it、GitHub Release、npm publishを一続きで行う。PRやAmadeus workflowからversionを上げず、production相当のpublishは人間の承認下で実行する。

## Code Style

私たちはTypeScript / ESMとBun直接実行を採用し、Biome lint、無効化したformatter、strictな `tsc --noEmit` に従う。`packages/framework/core/` のharness中立層と `packages/framework/harness/<name>/` のharness別表層を分離し、setup domainでは判別unionの `Result` を既決styleとして使う。
