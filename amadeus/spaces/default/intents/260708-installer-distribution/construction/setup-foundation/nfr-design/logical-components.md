# Logical Components — setup-foundation

> ステージ: nfr-design (3.3) / Unit: setup-foundation / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`(Rev.3)、`../nfr-requirements/tech-stack-decisions.md`(モジュール実装手段)、上記4設計、`../../../inception/application-design/components.md`・`component-methods.md`(置換注記の対象)

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
    fsops.ts             #   FsRead / FsWrite / TmpWrite(mkdtemp 配下限定)の分離ポート
  modules/
    resolver.ts          #   createResolver(http) — 書き込みポートなし
    fetcher.ts           #   createFetcher(http, tmpWrite) — tar/gunzip/validateEntry/SafePath を内包(SafePath はこのモジュール内局所のブランド型 — 展開実装の詳細であり公開契約ではない)
    manifest-io.ts       #   createManifestIo(fsRead, fsWrite) — マニフェスト1ファイルの正当な書き込み保持者
  shared/
    timestamps.ts        #   Timestamps.of(now) — {iso, token} 対生成(REL-F05)
```

- **書き込みポートの注入非対称が REL-F01 を実装する**: resolver = 書き込みなし、fetcher = TmpWrite のみ(対象プロジェクトのパスを型として受け取れない)、manifest-io = FsWrite(ただし cli の到達順序契約により applier 成功後のみ write — reliability-design 参照)
- **`createManifestIo(fsRead, fsWrite)` は component-methods.md(Rev.3)の `createManifestIo(fsops)` を置換する正式契約**(ポート分割の精緻化 — U2 の Plan.forInstall/Reporter API と同じ置換の流儀。component-methods.md 側にも置換注記を追加済み)
- **domain/ ↔ internal/ の依存規律**: コンパニオン(domain)は internal の `create*` ファクトリを**値インポート**し、internal は domain の型を **`import type`(型のみ)** で参照する — 出力 JS では internal → domain の実行時依存が消えるため**実行時循環なし**。この規律を lint(Biome の import ルール)ではなくコードレビュー+`tsc --noEmit` の `verbatimModuleSyntax` 相当の運用で守る(tech-stack-decisions の既存2構成の範囲内)
- modules → domain/ports の依存方向は従来どおり。循環なし(上記の型のみ参照規律込み)
