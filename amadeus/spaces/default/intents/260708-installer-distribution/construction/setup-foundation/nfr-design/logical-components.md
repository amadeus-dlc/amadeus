# Logical Components — setup-foundation

> ステージ: nfr-design (3.3) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`(Rev.3)、上記4設計、`../../../inception/application-design/components.md`

## ソースレイアウト(packages/setup/src/)

```
src/
  cli.ts                 # エントリ(U2 所有 — U1 はビルド対象の席のみ確保)
  domain/                # ドメイン型+コンパニオン(公開契約)
    semver.ts            #   SemVer + VersionError
    version-spec.ts      #   VersionSpec
    resolved-version.ts  #   ResolvedVersion
    payload.ts           #   ExtractedPayload + FetchError + HttpMeta
    manifest.ts          #   Manifest + ManifestFiles + ManifestError + Disposition + InstallMeta/BuildInput/ManifestJson
    harness.ts           #   HarnessName(型+all。parse は U2 の cli 側)
  internal/              # 非公開ファクトリ(クロージャ実装)
    semver-factory.ts, manifest-factory.ts, ...
  ports/                 # DI ポート型
    http.ts              #   Http(タイムアウト焼き込みファクトリ createHttp)
    fsops.ts             #   FsOps(読み書き分離: FsRead / FsWrite)
  modules/
    resolver.ts          #   createResolver(http)
    fetcher.ts           #   createFetcher(http) — tar/gunzip/validateEntry を内包
    manifest-io.ts       #   createManifestIo(fsRead, fsWrite)
  shared/
    timestamps.ts        #   Timestamps.of(now) — {iso, token} 対生成(REL-F05)
```

- **FsOps の読み書き分離**(FsRead/FsWrite)が REL-F01 の構造的保証を実装する: U1 モジュールへは FsRead(+一時領域限定の書き込み)のみを注入
- domain/ は他層に依存しない(依存方向: modules → domain/ports、internal → domain)。循環なし
