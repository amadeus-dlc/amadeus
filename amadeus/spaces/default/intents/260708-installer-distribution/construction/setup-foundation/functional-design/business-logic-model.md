# Business Logic Model — setup-foundation

> ステージ: functional-design (3.1) / Unit: setup-foundation / 作成: 2026-07-08
> 上流入力: `../../../inception/units-generation/unit-of-work.md`(U1)・`unit-of-work-story-map.md`、`../../../inception/requirements-analysis/requirements.md`(FR-002/006/012/016)、`../../../inception/application-design/components.md`・`component-methods.md`

## ワークフロー 1: バージョン解決(resolver、FR-006)

```
resolveVersion(spec, http):
  if spec.kind == "exact":
    tags = http.get(/repos/amadeus-dlc/amadeus/tags)          # 1リクエスト
    tag  = tags.find(t => t.name == normalize(spec.raw))       # "1.2.3" は "v1.2.3" に正規化
    return tag ? ResolvedVersion(tag, source:"tag") : ResolveError("not-found")
  # spec.kind == "latest"
  releases = http.get(/repos/amadeus-dlc/amadeus/releases)     # 1リクエスト
  stable   = releases.filter(r => !r.draft && !r.prerelease && isStableSemverTag(r.tag_name))
  if stable.nonEmpty: return max(stable, by=semverOrder)       # source:"release"
  tags   = http.get(/repos/amadeus-dlc/amadeus/tags)           # フォールバック時のみ +1
  stable = tags.filter(t => isStableSemverTag(t.name))
  if stable.nonEmpty: return max(stable, by=semverOrder)       # source:"tag"
  return ResolveError("no-stable-version")                     # ファイル無変更で終了(FR-006)
```

- `isStableSemverTag`: `^v\d+\.\d+\.\d+$` — プレリリースセグメント(`-rc.1` 等)を持つものは常に false(既定解決から除外)。`--version` 明示時のみプレリリース許可(exact 経路は正規表現を `^v?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$` に緩める)
- `semverOrder`: major→minor→patch の数値比較(辞書順禁止 — FR-006 受け入れ基準)

## ワークフロー 2: アーカイブ取得(fetcher、FR-012)

```
fetchArchive(version, http, tmpDir):
  url = codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags/{version.tag}
  attempt 1: download(url, tmpDir)
  on transient failure (DNS / conn-reset / 5xx / timeout):
    attempt 2: download(url, tmpDir)          # ちょうど1回の自動リトライ
  on second failure:
    return FetchError(classify(error))        # dns | conn | http(status) | rate-limit(403/429)
  extract(tar.gz, tmpDir)                     # 展開後にトップレベル dir を検証
  payload = locate(tmpDir/**/dist/)           # 配布物ルート(dist/<harness>/)の特定
  return ExtractedPayload(payload, version)
```

- 4xx(rate-limit を除く)はリトライしない(恒久エラー — 再試行は無意味)
- 展開結果に `dist/<harness>/` が1つも無い場合は `payload-invalid` エラー(取得物の完全性検証、ADR-003)

## ワークフロー 3: マニフェスト読み書き(manifest、FR-016)

```
readManifest(target):
  path = target/amadeus/.installer/amadeus-setup-manifest.json
  if !exists(path): return null                               # 未導入 or 手動導入
  json = parse(path)
  return validateSchema(json) ? Manifest(json) : ManifestError("schema")

buildManifest(payload, applied, meta):
  files = applied.entries.map(e => { path, class, required, md5: md5Of(payload file) })
  return { schemaVersion: 1, installerPackageVersion: meta.setupVersion,
           distributionVersion: meta.distVersion, sourceTag: meta.tag,
           installedAt: meta.installStartedAt, harness: meta.harness, files }
```

- md5 は**配布物側の内容**から計算して記録する(次回 upgrade の「期待 md5」— FR-008 の判定材料)
- `installedAt` はインストール開始時刻(バックアップの `$timestamp` と同一値)

## ワークフロー 4: ビルドパイプライン(ADR-002)

```
bun build src/cli.ts --target=node --format=esm --outfile=dist/cli.js
prepend shebang "#!/usr/bin/env node"
package.json: { bin: { "amadeus-setup": "dist/cli.js" }, files: ["dist/cli.js", "README.md", "LICENSE-*"] }
```

- 検証は U4 の pack 契約テスト(FR-018)が担う。U1 ではビルドが成立し bunx/npx 両起動が E2E フィクスチャで確認できること(FR-002)
