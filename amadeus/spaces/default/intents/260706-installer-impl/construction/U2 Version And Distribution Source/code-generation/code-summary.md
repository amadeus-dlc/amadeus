# Code Summary — U2 Version And Distribution Source

## 実装概要

U2として、`@amadeus-dlc/setup` の source distribution 解決・取得・metadata 読み取りを `packages/setup/src/**` に実装した。target detection、manifest、operation planning、file apply、verification は実装せず、ユーザーtargetへの書き込みは行わない。

## 変更ファイル

- `packages/setup/src/domain/source-types.ts`: U2の source/result 型、`VersionRequest`、`ResolvedVersion`、`TagCandidate`、`LoadedDistribution`、`DistributionFile`、file class、canonical repo を追加。
- `packages/setup/src/domain/version-resolver.ts`: 依存追加なしの SemVer tag resolver を追加。latest stable、explicit version、v-prefix優先、prerelease除外/明示許可、malformed diagnostics、`version-not-found` / `no-stable-version` を扱う。
- `packages/setup/src/ports/tag-source.ts`, `packages/setup/src/ports/archive-source.ts`, `packages/setup/src/ports/archive-extractor.ts`: fake-friendlyな source/archive/extractor ports を追加。
- `packages/setup/src/adapters/github-source.ts`: `GitHubTagSource` / `GitHubArchiveSource` をU2境界として使用し、archive fetchのadapter-owned one retryをテストで固定。
- `packages/setup/src/adapters/archive-extractor.ts`: `dist/<harness>/` のみを選択する extractor を追加。directory-backed fixture と tar.gz archive を扱い、absolute/path traversal/unsafe entries を拒否する。
- `packages/setup/src/domain/distribution-loader.ts`: archive source retryを重ねず、archive fetch -> harness extraction をつなぐ loader を追加。
- `packages/setup/src/domain/distribution-metadata.ts`: present metadata は `schemaVersion: 1` と harness を検証し、invalid present metadata は fallback せず `distribution-metadata-invalid` にする。metadata absent 時は `LoadedDistribution.files` から class/md5 を導出する。
- `packages/setup/src/application/setup-service.ts`: harness指定時に version/source/metadata まで解決し、U3以降未実装として `downstream-not-implemented` で停止する境界へ拡張。harness未指定は target/harness detection 未実装としてno-write停止する。
- `packages/setup/src/cli/types.ts`: U2の分類済みエラーコードを追加。
- `tests/unit/t202-setup-package-shell.test.ts`: U2接続後のdownstream boundaryに合わせて既存U1テストを更新。
- `tests/unit/t203-setup-version-resolver.test.ts`: SemVer ordering、v-prefix duplicate、prerelease、explicit version、missing/no stable/malformed diagnostics を追加。
- `tests/unit/t204-setup-source-distribution.test.ts`: fake/local archive・metadata・service no-target-write tests を追加。

## 依存関係

依存追加なし。SemVer処理、md5、tar.gz処理は TypeScript と Node/Bun 標準APIで実装した。

## 検証結果

- `bun test tests/unit/t202-setup-package-shell.test.ts tests/unit/t203-setup-version-resolver.test.ts tests/unit/t204-setup-source-distribution.test.ts` — pass: 25 tests。
- `bun run typecheck` — pass。
- `bun run lint` — pass(exit code 0)。既存 `tests/**` 側の warning/info は表示されたが、今回変更した `packages/setup/**` / U2 tests のblocking failureはなし。
- `bun packages/setup/src/maintainer/package-check.ts` — pass。
- `git diff --check` — pass。

## 非実装範囲

U2では target detection、install manifest、operation planning、file apply、post-install verification、CI/release workflow、docs更新は実装していない。source loading 成功後も target project には書き込まない。
