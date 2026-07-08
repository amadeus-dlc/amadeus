# Business Logic Model — setup-foundation

> ステージ: functional-design (3.1) / Unit: setup-foundation / 作成: 2026-07-08
> 上流入力: `../../../inception/units-generation/unit-of-work.md`(U1)・`unit-of-work-story-map.md`、`../../../inception/requirements-analysis/requirements.md`(FR-002/006/012/016)、`../../../inception/application-design/components.md`・`component-methods.md`
> Rev.2(2026-07-08): ドメインオブジェクトの振る舞い化(Tell, Don't Ask+functional-domain-modeling-ts)に合わせ、擬似コードをコンパニオン API 経由に改訂

## ワークフロー 1: バージョン解決(resolver、FR-006)

```
resolveVersion(spec: VersionSpec, http): Result<ResolvedVersion, ResolveError>
  if spec.kind == "exact":
    tags = http.get(/repos/amadeus-dlc/amadeus/tags)                    # 1リクエスト
    hit  = tags.mapNotNull(t => SemVer.parse(t.name).ok)                # 無効タグ名は黙って除外
             .find(sv => VersionSpec.admits(spec, sv))                  # 適合判定は spec が答える
    return hit ? ok(ResolvedVersion.fromTag(hit)) : err(ResolveError.notFound(spec))
  # spec.kind == "latest"
  releases = http.get(/repos/amadeus-dlc/amadeus/releases)              # 1リクエスト
  candidates = releases.filter(r => !r.draft && !r.prerelease)
                       .mapNotNull(r => SemVer.parse(r.tag_name).ok)
  best = SemVer.latestStableOf(candidates)                              # 最新安定の選定は SemVer が所有(Tell, Don't Ask)
  if best: return ok(ResolvedVersion.fromRelease(best))
  tags = http.get(/repos/amadeus-dlc/amadeus/tags)                      # フォールバック時のみ +1
  best = SemVer.latestStableOf(tags.mapNotNull(t => SemVer.parse(t.name).ok))
  if best: return ok(ResolvedVersion.fromTag(best))
  return err(ResolveError.noStableVersion())                            # ファイル無変更で終了(FR-006)
```

- 安定判定・順序付け・正規化はすべて `SemVer` コンパニオンが所有(BR-F02/F03/F05)。resolver は候補集合の構築と HTTP のみを担い、バージョン知識を持たない
- プレリリース許容の分岐は `VersionSpec.admits` に内包(BR-F04)— 呼び出し側は spec の中身で分岐しない

## ワークフロー 2: アーカイブ取得(fetcher、FR-012)

```
fetchArchive(version: ResolvedVersion, http, tmpDir): Result<ExtractedPayload, FetchError>
  url = ResolvedVersion.archiveUrl(version)               # URL 構築は持ち主(ADR-003)
  r1 = download(url, tmpDir)
  if r1.err:
    e = FetchError.classify(r1.cause, r1.meta)            # 分類はエラー型の持ち主
    if !FetchError.isTransient(e): return err(e)          # 恒久エラーは即返す(BR-F07)
    r2 = download(url, tmpDir)                            # ちょうど1回の自動リトライ(BR-F06)
    if r2.err: return err(FetchError.classify(r2.cause, r2.meta))
  extract(tar.gz, tmpDir)
  return ExtractedPayload.locate(tmpDir, version)         # dist/<harness>/ 検出+payload-invalid 判定を内包(BR-F10)
```

- 「リトライしてよいか」は `FetchError.isTransient` が答える — fetcher は分類結果の中身で分岐しない(Tell, Don't Ask)

## ワークフロー 3: マニフェスト読み書き(manifest、FR-016)

```
readManifest(target): Result<Manifest | null, ManifestError>
  path = target/amadeus/.installer/amadeus-setup-manifest.json
  if !exists(path): return ok(null)                       # 未導入 or 手動導入(BR-F15)
  return Manifest.parse(readJson(path))                   # schemaVersion 検査込み(BR-F12)— Parse, Don't Validate

buildManifest(payload, applied, meta):
  files = ManifestFiles.fromEntries(applied.map(e => { path, class, required, md5: md5Of(payload file) }))
  return Manifest.build(payload, files, meta)             # 不変条件(重複 path 禁止等)は ManifestFiles/Manifest が所有
```

- md5 は**配布物側の内容**から計算して記録する(次回 upgrade の期待値)。upgrade 時の処遇判定は `Manifest.dispositionFor(path, actualMd5)` が Disposition(overwrite / backup-then-copy / preserve)を返す — planner に md5 比較の if を書かせない(FR-008 の判定所有、Tell, Don't Ask)
- `installedAt` はインストール開始時刻(バックアップの `$timestamp` と同一値、BR-F14)

## ワークフロー 4: ビルドパイプライン(ADR-002)

```
bun build src/cli.ts --target=node --format=esm --outfile=dist/cli.js
prepend shebang "#!/usr/bin/env node"
package.json: { bin: { "amadeus-setup": "dist/cli.js" }, files: ["dist/cli.js", "README.md", "LICENSE-*"] }
```

- 検証は U4 の pack 契約テスト(FR-018)が担う。U1 ではビルドが成立し bunx/npx 両起動が E2E フィクスチャで確認できること(FR-002)
