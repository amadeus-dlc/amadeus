# Domain Entities — u2-installer-asset

上流入力(consumes 全数): component-methods(C2 契約)、requirements(FR-2)、components(C2)、unit-of-work(u2)、unit-of-work-story-map(Slice 1)、services(境界の障害モード表)。

## 型定義(functional-domain-modeling-ts スタイル — 既存 packages/setup の Result 慣行に整合)

```ts
// packages/setup/src/internal/resolved-version-factory.ts 拡張
type ArchiveSource =
  | { readonly kind: "asset"; readonly url: URL; readonly checksumUrl: URL }
  | { readonly kind: "codeload"; readonly url: URL }; // 判別 union — 経路が型で追跡可能

namespace ArchiveSource {
  // 純粋関数: version と ASSET_INTRO_VERSION のみに依存(ネットワーク非依存 — BR-U2-1)
  export declare function resolve(tag: string): Result<ArchiveSource, FetchError>;
}

// 既存 FetchError("payload-invalid" 等)へ追加する変種(既存 typed error 慣行に整合)
// - "asset-missing"(新版 404 — 旧版判定と区別された明示メッセージ)
// - "checksum-mismatch"
// - "checksum-unavailable"(SHA256SUMS 欠落)
```

- 既存 `ExtractedPayload` / `resolveWrapperDir`(payload-factory.ts:12)は無改修で流用(G6)。locate の2段 fallback のみ追加
- fail-closed 変種を既存 fatal 経路と分離(想定内の欠落・不一致を fatal error 経路へ流さない — project.md Forbidden との整合を typed error 変種で表現)

## 不変条件

1. `ArchiveSource.resolve` は同一入力に対し常に同一出力(ネットワーク・時刻・環境非依存)
2. asset 経路で checksum 検証を通過せずに展開処理へ進む経路が存在しない
3. codeload 変種の URL 組立は現行(:14)と byte 同一
4. ALLOWED_HOSTS は正確に4ホスト(既存2+追加2)— ワイルドカードなし
5. `ArchiveSource` の asset 変種が成立して初めて Slice 1(unit-of-work-story-map の walking skeleton)の E2E が実行可能になる — 本型は Slice 1 出荷判定の前提エンティティ
