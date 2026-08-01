# Domain Entities — u4-tools-distribution

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## E1: PluginManifest(拡張)

`{ name, stages, seams, fragments, tools }` — tools は `tools/<file>.ts` 形の相対パス配列(components.md C2)。所有: amadeus-plugin-compose.ts(既存 PluginManifest 型 :107-109 の拡張)。

## E2: composition record(拡張)

`ownedPaths` に tools パスが加わり、`ownedContentDigests` が stages+tools の全 owned ファイルを被覆する(M2)。既存 record(tools なし)は後方互換で読める。

## E3: ハーネスツリー集合

一括 compose の対象 = 検出された現存ハーネスディレクトリ(component-methods.md C3 の検出流儀)。検出のみで新規作成はしない(存在しないツリーを作らない — 対象は実在ツリー限定)。

## E4: 消費契約(下流)

- u8(e2e): 全ツリー compose 済み状態を前提に advisory 到達を実測
- u3(t377): compose 済みコピー(.claude/plugins/)と staging が検査4面に含まれる — u4 の配布結果が u3 の検査対象になる(services.md の配布面)
