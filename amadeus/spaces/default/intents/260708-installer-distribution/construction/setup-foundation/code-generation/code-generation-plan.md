# Code Generation Plan — setup-foundation(U1 / Bolt 1 walking skeleton)

> ステージ: code-generation (3.5) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../functional-design/`(domain-entities Rev.3・business-logic-model・business-rules)、`../nfr-design/logical-components.md`(ソースレイアウト)、`../nfr-requirements/tech-stack-decisions.md`、`../infrastructure-design/cicd-pipeline.md`(CI 配線・遅延ビルドヘルパー契約)、ADR-001/002/003
> テスト戦略: Standard(コンポーネントごとにユニットテスト5〜8本+主要境界の統合テスト)

## 実装スタイル(拘束)

- **functional-domain-modeling-ts**(project.md DECIDED): 型はインスタンスメソッドを宣言、実装は internal ファクトリ+クロージャの `Object.freeze` リテラル、コンパニオン namespace は static 相当(parse/build/コレクション演算)のみ
- domain ↔ internal の依存規律: コンパニオンは internal の `create*` を値インポート、internal は domain 型を `import type` のみで参照(実行時循環なし)
- ランタイム依存ゼロ(NFR-005/ADR-002)— tar/gunzip は Node 組み込み zlib+自前 tar パーサ(fetcher 内部詳細)
- アプリケーションコードはワークスペースルート(`packages/setup/`、テストは既存 `tests/` 層)へ。record dir には置かない

## ステップ(トレーサビリティ付き)

- [x] **Step 1: パッケージ骨格+CI 配線**(FR-017, NFR-006, team.md Mandated)
  - `packages/setup/package.json`(name `@amadeus-dlc/setup`、version `0.1.0`、`bin.amadeus-setup: dist/cli.js`、license `(MIT OR Apache-2.0)`、repository = amadeus-dlc/amadeus、files = FR-018 契約と整合)
  - LICENSE 2種(MIT / Apache-2.0)を `packages/setup/` に同梱、最小 README stub
  - root `tsconfig.json` include へ **再帰グロブ `packages/setup/src/**/*.ts`** 追加+root `package.json` lint スコープ拡張(`check tests/` → `check tests/ packages/setup/`)— **同一 PR 必須**
  - 追加: `biome.json` に `!packages/setup/dist/**` 除外と `.gitignore` に `packages/setup/dist/` を追加(ビルド生成物を lint 対象・VCS 追跡対象から除外。計画には無かったが CI 配線の一部として必要と判断)
- [x] **Step 2: shared/timestamps.ts**(REL-F05)— `Timestamps.of(now)` が `{iso, token}` 対(拡張 ISO / ファイル名用 basic 形式)を生成 + ユニットテスト
- [x] **Step 3: domain バージョン系**(FR-006, US-B5)— `domain/semver.ts`(SemVer + VersionError)、`domain/version-spec.ts`(VersionSpec.admits)、`domain/resolved-version.ts`(archiveUrl 等)+ internal ファクトリ + ユニットテスト(パース境界・プレリリース順序・admits)
- [x] **Step 4: domain ペイロード/マニフェスト系**(FR-016 スキーマ, US-A7)— `domain/payload.ts`(ExtractedPayload + FetchError.classify/isTransient + HttpMeta)、`domain/manifest.ts`(Manifest.parse/build、ManifestFiles.dispositionFor、Disposition、ManifestError)、`domain/harness.ts`(HarnessName)+ internal ファクトリ + ユニットテスト(dispositionFor 全分岐・schemaVersion 検査・重複 path 不変条件)
- [x] **Step 5: ports**(REL-F01 の注入非対称)— `ports/http.ts`(createHttp: API 10s / アーカイブ 20s/試行のタイムアウト焼き込み)、`ports/fsops.ts`(FsRead / FsWrite / TmpWrite=mkdtemp 配下限定)
- [x] **Step 6: modules/resolver.ts**(FR-006, ADR-003)— createResolver(http): releases → tags フォールバック、SemVer 順序、API 呼び出し最大2回 + fake Http ユニットテスト(200/403 rate-limit/404/ネットワーク断)
- [x] **Step 7: modules/fetcher.ts**(FR-012, US-A7, BR-F06/07/10)— createFetcher(http, tmpWrite): codeload 取得、ちょうど1回の自動リトライ(isTransient のみ)、gunzip+自前 tar 展開、validateEntry/SafePath(パストラバーサル拒否)、**単一トップレベルラッパー解決**(codeload 形状・名前非依存)→ ExtractedPayload.locate + ユニットテスト(リトライ分岐・破損アーカイブ・ラッパー欠落/複数・payload-invalid)
- [x] **Step 8: modules/manifest-io.ts**(FR-016)— createManifestIo(fsRead, fsWrite): `amadeus/.installer/amadeus-setup-manifest.json` 読み書き + ユニットテスト(未導入 null・破損 JSON・スキーマ不一致)
- [x] **Step 9: cli.ts 最小席+ビルド成立**(FR-002, ADR-002)— U2 所有の本実装前の最小エントリ(help 表示・exit 0)。`bun build src/cli.ts --target=node --format=esm` で dist/cli.js 生成が通ること(shebang 付与)
- [x] **Step 10: 遅延ビルドヘルパー+FR-002 スモーク E2E**— `tests/lib/setup-lazy-build.ts`(`ensureSetupCliBuilt(): Promise<string>`、不在時のみ ADR-002 コマンド、冪等)を**初出実装**し、node/bun 両ランタイムでの dist/cli.js 起動スモーク(tests/smoke 層に配置 — 理由は completion-notes 参照)
- [x] **Step 11: 統合テストスタブ**(Standard 戦略)— resolver→fetcher→manifest-io の境界を fake ポートで通す統合テスト(tests/integration)
- [x] **Step 12: 検証一式**— `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` グリーン+`bun run dist:check` / `bun run promote:self:check`(installer 関連 Mandated)

## 完了メモ(code-generation 実行結果)

- 全12ステップ完了。テストは新規13ファイル・93テスト・164 assertion(すべて green)。`bash tests/run-tests.sh --ci` はリポジトリ全体で245ファイル・3732 assertion green(既存テストは無変更)。
- **Step 10 の配置判断**: FR-002 スモークテストは `tests/smoke/` に配置した(`tests/e2e/` ではなく)。理由: `run-tests.ts` の `--ci` プロファイルは `smoke+unit+integration` のみを含み `e2e` を含まない。CI ワークフロー(`.github/workflows/ci.yml`)は `bash tests/run-tests.sh --ci` を実行するため、`tests/e2e/` に置くとこの必須検証が CI で一切実行されなくなる。`tests/smoke/` の「構造検証」という趣旨には完全には一致しないが、CI ゲートに含める必要性を優先した。
- **resolver のエラー型に関するギャップ埋め**: `business-logic-model.md` の `resolveVersion` 擬似コードは `http.get()` 自体の失敗(ネットワーク断・rate-limit 等)を明示的に扱っておらず、`ResolveError`(no-stable-version/not-found の2種)にもネットワーク障害を表すバリアントが無い。これを「候補ゼロ」として握り潰すと rate-limit 時にも `no-stable-version` という誤った案内になるため、`modules/resolver.ts` の `Resolver` 型のみ `resolveVersion(): Promise<Result<ResolvedVersion, ResolveError | FetchError>>` とし、既存の凍結契約(`ResolveError`/`FetchError` それぞれの variant 一覧)には一切手を入れずに、モジュール境界でユニオンを取った。
- **Result<T,E> 共通型の追加**: 設計書は `Result<T,E>` を随所で使用するが定義場所の指定が無かったため、`shared/result.ts` に functional-domain-modeling-ts 準拠の companion namespace として追加した(event-store-adapter-js 正準実装と同形)。
- SIGINT/SIGTERM ハンドラでの一時領域強制削除(security-design.md 記載)は、実際の install/upgrade オーケストレーション(U2 の cli 所有)に配線する事項のため本 Bolt では実装していない。`TmpWrite.remove()` は提供済みで、U2 が呼び出す。

## ストーリー/要件 → ステップ対応

| 要件/ストーリー | ステップ |
|-----------------|----------|
| US-B5(取得規約)/ FR-006 | 3, 6 |
| US-A7(ネットワーク失敗基盤)/ FR-012 | 4, 7 |
| FR-016(マニフェストスキーマ) | 4, 8 |
| FR-002(ビルド・npx/bunx 両起動) | 9, 10 |
| FR-017(独立 semver 0.1.0) | 1 |
| NFR-005(ランタイム依存ゼロ) | 1, 7(自前 tar) |
| NFR-006(CI 互換・配線) | 1, 12 |
| REL-F01(書き込みポート非対称) | 5〜8 |
| REL-F05(タイムスタンプ二重表現) | 2 |

## スコープ外(このユニットでやらないこと)

- CLI 引数解析・ウィザード・install/upgrade 実行経路(U2/U3)
- planner/applier/verifier/reporter(U2)
- pack 契約テスト(U4 — ただし package.json の files はここで FR-018 契約に整合させて書く)
- root package.json の I1/I2 メタデータ是正(U5 に移管済み)
