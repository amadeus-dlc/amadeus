# Code Generation Memory

## U1 Setup Package Shell

- `@amadeus-dlc/setup` は `packages/setup/` に閉じる。root `package.json` は dev-only のまま維持し、公開 package metadata は `packages/setup/package.json` を source of truth とする。
- `amadeus-setup` の npm bin は Node/npm wrapper (`packages/setup/bin/amadeus-setup.js`) とし、Bun が PATH にあれば `packages/setup/src/bin/amadeus-setup.ts` へ argv-array spawn で delegation する。Bun 不在時は `bun-required` を human-readable stderr で返す。
- U1 の help/parser/error path は target filesystem と application service boundary に触れない。valid `install` / `upgrade` だけが boundary に到達し、そこでも `not-implemented-in-this-slice` で no target access のまま停止する。
- `init` は installer CLI では採用しない。help に出さず、入力された場合は `unsupported-command` として `amadeus-setup install` を next action にする。
- U1 verification は `bun test tests/unit/t202-setup-package-shell.test.ts`、`bun run typecheck`、`bun run lint`、`bun run check`、`bun packages/setup/src/maintainer/package-check.ts`、`git diff --check` で通過した。`bun run lint` / `bun run check` は既存 tests 側 warnings/infos を表示するが終了コードは 0。

## U2 Version And Distribution Source

- U2は `packages/setup/src/domain/source-types.ts` を中心に、`ResolvedVersion`、`LoadedDistribution`、`DistributionFile`、`SourceResult` を追加し、U1の `Harness` 型を再利用する。source repo は `https://github.com/amadeus-dlc/amadeus` 固定。
- SemVer resolver は外部依存なしで実装した。defaultはstable tagのみをSemVer順に並べ、`vX.Y.Z` を bare duplicate より優先し、prerelease/malformed/duplicate を diagnostics に残す。明示 `--version vX.Y.Z` は exact tag 必須、bare SemVer は `v` 優先から bare fallback。
- Source ports は `TagSourcePort`、`ArchiveSourcePort`、`ArchiveExtractorPort` に分けた。archive fetch retry は `ArchiveSourcePort` 実装の責務で、`loadDistribution` は二重retryしない。
- Archive extraction は selected `dist/<harness>/` のみを temp root へ展開する。directory-backed fixture と tar.gz archive を扱い、absolute path、`..` segment、selected harness内のunsupported entryを `archive-invalid` として拒否する。
- Distribution metadata は present metadata が valid な場合だけ採用し、invalid present metadata では fallback しない。metadata absent 時は `LoadedDistribution.files` の md5 と path policy から `owned` / `shared` / `user-preserved` を導出する。
- `executeSetupCommand` は harness指定時に fake/default depsで version/source/metadata まで進み、target detection/planning/apply/manifest/verification 未実装を `downstream-not-implemented` でno-write停止する。harness未指定も U3 detection未実装としてno-write停止する。
- U2 verification は `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts`、`bun run typecheck`、`bun run lint`、`bun packages/setup/src/maintainer/package-check.ts`、`git diff --check` で通過した。`bun run lint` は既存 tests 側 warning/info を表示するが終了コードは 0。

## U4 Operation Planning And Safety

- U4は `packages/setup/src/domain/plan-types.ts`、`backup-planner.ts`、`operation-planner.ts` を中心に、`FileOperationPlan` / `FileOperation` / `PlanningContext` と install/upgrade planner、plan invariant validation を追加した。live filesystem は読まず、U3 snapshot と injected `backupPathExists` のみを使う。
- install planner は source metadata class を優先し、`user-preserved` skip、absent add、owned update/force-update、shared changed/unknown backup-before-update、non-interactive collision no-write、interactive confirmation plan、`--force` backup-before-force-update を生成する。
- upgrade planner は file planning 前に target state/version policy を評価し、`none` / `unsupported-layout` / `ambiguous-harness` / `partial` without force / already-up-to-date / downgrade / installed-newer-than-latest を no-write とする。forced `partial` と `manual-or-unknown` は conservative shared backup policy を使う。
- backup path は 1 plan あたり 1 つの UTC basic timestamp を共有し、`<originalPath>.<timestamp>.bk` と collision suffix `.1.bk` 形式を使う。
- `executeSetupCommand` は U2 source load と U3 detection/snapshot の後に plan を生成し、plan summary を `downstream-not-implemented` diagnostics に含めて U5 apply/manifest 前で no-write 停止する。
- U4 verification は `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts`、`bun run typecheck`、`bun run lint`、`bun packages/setup/src/maintainer/package-check.ts`、`git diff --check` で通過した。`bun run lint` は既存 tests 側 warning/info を表示するが終了コードは 0。

## U5 Apply Verify And UX

- U5は `packages/setup/src/domain/file-applier.ts`、`verifier.ts`、`manifest-builder.ts`、`apply-types.ts`、`harness-paths.ts`、`cli/reporter.ts`、`application/setup-service.ts` を中心に、approved `FileOperationPlan` の render/confirm/apply/manifest/verify/result orchestration を実装した。
- File Applier は plan order 通りに `backup` -> `add`/`update`/`force-update` を実行し、`skip`/`conflict` は no-op、`canApply:false` は mutation 拒否とする。manifest write は apply success 後のみ開始する。
- Manifest Store は manifest directory 内 temp file + rename の atomic write adapter を使う。failure は `manifest-write-failed` として applied operations と backup diagnostics を報告する。
- Verifier は manifest required entries、harness directory、tools directory、active-space memory shell を existence check し、fresh install の state/intent 不在は失敗にしない。
- Reporter は `renderPlan` / `renderResult` で `Operation` / `Files` / `Example` 列、backup path、force marker、classified error の no-change guarantee と next action を出力する。
- PromptPort は `confirmApply` を追加し、`--yes` / non-interactive では prompt を呼ばず、default confirmation は no-write とする。
- `executeSetupCommand` は `downstream-not-implemented` stop を削除し、plan -> render -> confirm -> apply -> manifest -> verify -> result の end-to-end flow と exit code を返す。
- U5 verification は `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts tests/unit/t207-setup-apply-verify-ux.test.ts`、`bun run typecheck`、`bun run lint`、`bun packages/setup/src/maintainer/package-check.ts`、`git diff --check` で通過した。`bun run lint` は既存 tests 側 warning/info を表示するが終了コードは 0。

## U6 Installer Test Harness

- U6は `tests/helpers/setup/` を中心に、typed fixture builders、fake ports、temp target/source builders、snapshot normalizer、coverage handoff helper を追加した。runtime dependency は追加していない。
- `fakeTagSource` / `fakeArchiveSource` / `FakeTargetFiles` / `fakePromptPort` は deterministic failure injection と call history を提供し、live GitHub や real user project mutation を不要にした。
- `seedTargetFixture` は clean、manifest-installed、manual-or-unknown、partial、none、unsupported、ambiguous-harness の temp target state を isolated temp directory に構築する。
- `seedCodexDistributionDir` と tar archive builder は source distribution fixture を fake archive port 経由で供給する。
- `normalizeInstallerOutput` / `stablePlanSnapshot` は reporter output から host-specific temp path と timestamp を除去する。
- `assertSetupCoverageHandoff` は t202–t208 の `covers:` header を列挙し、U7 CI handoff の machine-readable index を提供する。
- `tests/unit/t208-setup-test-harness.test.ts` は harness self-test、integration test（clean install、manifest-first upgrade no-write、collision no-write、archive retry failure、kiro ambiguity、plan snapshot）、smoke test（help、bun-required）を追加した。
- U6 verification は `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts tests/unit/t207-setup-apply-verify-ux.test.ts tests/unit/t208-setup-test-harness.test.ts`、`bun run typecheck`、`bun run lint`、`bun packages/setup/src/maintainer/package-check.ts`、`git diff --check` で通過した。`bun run lint` は既存 tests 側 warning/info を表示するが終了コードは 0。

## U7 CI And Package Gates

- U7は `packages/setup/src/maintainer/` を中心に、installer change detector、gate registry/planner、package dry-run、coverage gate、security gate、scanner adapters を追加した。`package-check.ts` は `--report` で JSON artifact を書ける。
- `tests/setup/run-installer-smoke.ts` と `tests/setup/run-installer-integration.ts` は U6 harness を CI 向けに実行し、smoke/integration レポートを `.amadeus-ci/setup/` 形式で返す。
- `packages/setup/security/vulnerability-allowlist.json` は High/Critical 例外の rationale/owner/expiry を明示レビュー可能にした。初回は空配列。
- `tests/.coverage-ratchet.json` に `installer` baseline を追加し、`coverage-gate.ts --scope installer` が U6 `covers:` freshness と ratchet を blocking 判定する。
- `.github/workflows/ci.yml` に `installer-gates` job を追加し、installer-related PR のみ package/security/coverage gate を実行する。non-installer PR は package-specific gate を skip して global `check` job を維持する。
- `tests/unit/t209-setup-ci-gates.test.ts` は classifier、gate contract、security schema、allowlist exception、coverage ratchet wiring を検証する。
- U7 verification は `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts tests/unit/t207-setup-apply-verify-ux.test.ts tests/unit/t208-setup-test-harness.test.ts tests/unit/t209-setup-ci-gates.test.ts`、`bun run typecheck`、`bun run lint`、`bun packages/setup/src/maintainer/package-check.ts`、`git diff --check` で通過した。`bun run lint` は既存 tests 側 warning/info を表示するが終了コードは 0。runtime dependency は追加していない。

## U8 Manual Release And Docs

- U8は `packages/setup/src/maintainer/` に release tag selector、release preflight plan、build/evidence、publish-validate、post-publish-verify、docs-consistency を追加した。U7 gate command contract を release mode では changed-file skip なしで無条件実行する。
- `.github/workflows/release-setup.yml` は `workflow_dispatch` のみ起動し、dry_run デフォルト true、protected environment `npm-publish` 承認後のみ `npm publish --provenance` を 1 回実行する。
- root `README.md` と `packages/setup/README.md` を installer-first に更新し、`amadeus-setup install` / `upgrade` を主導線、manual `cp -r dist/<harness>/` を fallback 扱いにした。`init` command は docs に記載しない。
- `tests/unit/t210-setup-release-docs.test.ts` は tag selection、release preflight plan、docs consistency、workflow wiring を検証する。
- U8 verification は `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts tests/unit/t205-setup-target-state.test.ts tests/unit/t206-setup-operation-planning.test.ts tests/unit/t207-setup-apply-verify-ux.test.ts tests/unit/t208-setup-test-harness.test.ts tests/unit/t209-setup-ci-gates.test.ts tests/unit/t210-setup-release-docs.test.ts`、`bun run typecheck`、`bun run lint`、`bun packages/setup/src/maintainer/package-check.ts`、`git diff --check` で通過した。`bun run lint` は既存 tests 側 warning/info を表示するが終了コードは 0。runtime dependency は追加していない。
