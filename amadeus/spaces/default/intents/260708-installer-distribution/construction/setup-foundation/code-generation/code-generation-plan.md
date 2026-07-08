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

- [ ] **Step 1: パッケージ骨格+CI 配線**(FR-017, NFR-006, team.md Mandated)
  - `packages/setup/package.json`(name `@amadeus-dlc/setup`、version `0.1.0`、`bin.amadeus-setup: dist/cli.js`、license `(MIT OR Apache-2.0)`、repository = amadeus-dlc/amadeus、files = FR-018 契約と整合)
  - LICENSE 2種(MIT / Apache-2.0)を `packages/setup/` に同梱、最小 README stub
  - root `tsconfig.json` include へ **再帰グロブ `packages/setup/src/**/*.ts`** 追加+root `package.json` lint スコープ拡張(`check tests/` → `check tests/ packages/setup/`)— **同一 PR 必須**
- [ ] **Step 2: shared/timestamps.ts**(REL-F05)— `Timestamps.of(now)` が `{iso, token}` 対(拡張 ISO / ファイル名用 basic 形式)を生成 + ユニットテスト
- [ ] **Step 3: domain バージョン系**(FR-006, US-B5)— `domain/semver.ts`(SemVer + VersionError)、`domain/version-spec.ts`(VersionSpec.admits)、`domain/resolved-version.ts`(archiveUrl 等)+ internal ファクトリ + ユニットテスト(パース境界・プレリリース順序・admits)
- [ ] **Step 4: domain ペイロード/マニフェスト系**(FR-016 スキーマ, US-A7)— `domain/payload.ts`(ExtractedPayload + FetchError.classify/isTransient + HttpMeta)、`domain/manifest.ts`(Manifest.parse/build、ManifestFiles.dispositionFor、Disposition、ManifestError)、`domain/harness.ts`(HarnessName)+ internal ファクトリ + ユニットテスト(dispositionFor 全分岐・schemaVersion 検査・重複 path 不変条件)
- [ ] **Step 5: ports**(REL-F01 の注入非対称)— `ports/http.ts`(createHttp: API 10s / アーカイブ 20s/試行のタイムアウト焼き込み)、`ports/fsops.ts`(FsRead / FsWrite / TmpWrite=mkdtemp 配下限定)
- [ ] **Step 6: modules/resolver.ts**(FR-006, ADR-003)— createResolver(http): releases → tags フォールバック、SemVer 順序、API 呼び出し最大2回 + fake Http ユニットテスト(200/403 rate-limit/404/ネットワーク断)
- [ ] **Step 7: modules/fetcher.ts**(FR-012, US-A7, BR-F06/07/10)— createFetcher(http, tmpWrite): codeload 取得、ちょうど1回の自動リトライ(isTransient のみ)、gunzip+自前 tar 展開、validateEntry/SafePath(パストラバーサル拒否)、**単一トップレベルラッパー解決**(codeload 形状・名前非依存)→ ExtractedPayload.locate + ユニットテスト(リトライ分岐・破損アーカイブ・ラッパー欠落/複数・payload-invalid)
- [ ] **Step 8: modules/manifest-io.ts**(FR-016)— createManifestIo(fsRead, fsWrite): `amadeus/.installer/amadeus-setup-manifest.json` 読み書き + ユニットテスト(未導入 null・破損 JSON・スキーマ不一致)
- [ ] **Step 9: cli.ts 最小席+ビルド成立**(FR-002, ADR-002)— U2 所有の本実装前の最小エントリ(help 表示・exit 0)。`bun build src/cli.ts --target=node --format=esm` で dist/cli.js 生成が通ること(shebang 付与)
- [ ] **Step 10: 遅延ビルドヘルパー+FR-002 スモーク E2E**— `tests/lib/setup-lazy-build.ts`(`ensureSetupCliBuilt(): Promise<string>`、不在時のみ ADR-002 コマンド、冪等)を**初出実装**し、node/bun 両ランタイムでの dist/cli.js 起動スモーク(tests/e2e または smoke 層、既存 run-tests.sh 層区分に従う)
- [ ] **Step 11: 統合テストスタブ**(Standard 戦略)— resolver→fetcher→manifest-io の境界を fake ポートで通す統合テスト(tests/integration)
- [ ] **Step 12: 検証一式**— `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` グリーン+`bun run dist:check` / `bun run promote:self:check`(installer 関連 Mandated)

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
