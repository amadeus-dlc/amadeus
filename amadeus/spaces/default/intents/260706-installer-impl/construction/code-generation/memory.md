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
