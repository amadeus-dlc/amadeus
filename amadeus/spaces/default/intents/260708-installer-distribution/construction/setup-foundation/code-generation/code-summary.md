# Code Summary — setup-foundation(U1 / Bolt 1 walking skeleton)

> ステージ: code-generation (3.5) / Unit: setup-foundation / 作成: 2026-07-08
> ビルダー: amadeus-developer-agent(codegen-u1)/ 全12ステップ完了

## 作成/変更ファイル

- **パッケージ本体**: `packages/setup/`(package.json 0.1.0・README・LICENSE 2種、src/ = cli.ts 最小席、shared/{result,timestamps}、domain/ 6ファイル、internal/ 7ファクトリ、ports/{http,fsops}、modules/{resolver,fetcher,manifest-io})
- **root 配線**(同一コミット — team.md Mandated): tsconfig.json(再帰グロブ)、package.json(lint スコープ)、biome.json(dist 除外)、.gitignore(`packages/setup/dist/`)、bun.lock
- **テスト**: tests/unit 11ファイル+tests/integration 1+tests/smoke 1、ヘルパー `tests/lib/setup-lazy-build.ts`(ensureSetupCliBuilt 初出)+`tests/lib/setup-tar-fixture.ts`(合成 ustar 生成)

## 主要な実装判断

1. **FR-002 スモークの配置**: `tests/smoke/`(`--ci` プロファイルに含めるため。`tests/e2e/` では CI で実行されない)
2. **resolver のエラー型ギャップ埋め**: `Resolver` の戻り値のみ `Result<ResolvedVersion, ResolveError | FetchError>` にモジュール境界でユニオン(凍結ドメイン契約は無改変。rate-limit を no-stable-version に握り潰さないため)
3. **`shared/result.ts` 追加**: Result<T,E> の定義場所が設計未指定だったため、functional-domain-modeling-ts 正準(event-store-adapter-js)と同形で追加
4. **SIGINT/SIGTERM ハンドラは U2 へ**: オーケストレーション(cli)所有のため本 Bolt 未実装。`TmpWrite.remove()` は提供済み
5. **自前 tar パーサ**: ustar+PAX 'x'+GNU 'L' の最小サブセット、512B ブロックのストリーミング状態機械。symlink/hardlink 等の特殊エントリは一律 payload-invalid 拒否(SEC-F01)

## テスト結果(ビルダー実行結果)

- 新規: 13ファイル・93テスト・164 assertion 全 pass
- `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`(245ファイル・3732 assertion)/ `bun run dist:check` / `bun run promote:self:check` — すべて green

## 計画からの逸脱

計画外の追加は .gitignore/biome.json の dist 除外(CI 配線の一部として必要)のみ。スコープ外(U2〜U4)への越境なし。
