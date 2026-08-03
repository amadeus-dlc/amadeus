# Domain Entities — u1-asset-build

上流入力(consumes 全数): component-methods(C1 契約 — 型の導出元)、requirements(NFR-1/5)、components(C1)、services(asset 3点の公開単位)、unit-of-work(u1 境界)、unit-of-work-story-map(Slice 1)。

## 型定義(functional-domain-modeling-ts スタイル)

```ts
// scripts/release-dist.ts 内(repo-only。core へは置かない)
type DistAssetVersion = string & { readonly __brand: "DistAssetVersion" }; // smart constructor で semver 検証

interface DistAssetManifest {
  readonly schema: 1;
  readonly version: string;
  readonly tarball: string;
  readonly sha256: string;      // hex 64
  readonly sizeBytes: number;
  readonly harnesses: readonly string[]; // discoverHarnessNames 由来 + "plugins"
  readonly fileCount: number;
}

interface DistAssetBundle {
  readonly tarPath: string;
  readonly checksumPath: string; // SHA256SUMS
  readonly manifestPath: string;
}

type SelfCheckResult =
  | { readonly kind: "ok" }
  | { readonly kind: "mismatch"; readonly detail: string }; // 判別 union、fail closed の根拠

// コンパニオン namespace(functional-domain-modeling-ts — static 相当は namespace 側)
namespace DistAssetVersion {
  // parse-don't-validate: 検証済みを型で運ぶ。失敗は typed error(Result)
  export declare function parse(raw: string): Result<DistAssetVersion, string>;
}
namespace DistAssetManifest {
  export declare function build(args: {
    version: DistAssetVersion; tarPath: string; harnesses: readonly string[];
  }): Promise<DistAssetManifest>; // sha256/sizeBytes/fileCount は tar 実体から算出
  export declare function selfCheck(m: DistAssetManifest, tarPath: string): Promise<SelfCheckResult>; // tar 再読取から導出
}
```

- 検証済みであることを型で運ぶ(parse-don't-validate): `DistAssetVersion` は smart constructor(不正 semver は Result.err)
- `SelfCheckResult` の `mismatch` は tar 実体の再読取から導出(検証劇場禁止 — 生成時の内部状態と比較しない)

## 不変条件

1. `manifest.sha256` = tar ファイルの実 SHA-256(SHA256SUMS の同エントリと同値)
2. `manifest.harnesses` = tar wrapper 直下のディレクトリ集合(順序は辞書順)
3. `manifest.fileCount` = tar の全エントリ数(ディレクトリエントリ除くファイル数 — 定義を実装コメントに固定)
4. 同一入力での再実行は同一 bytes(BR-U1-2)

## 関連エンティティ(既存流用)

- `HarnessManifest`(packages/framework/harness/*/manifest.ts)— buildTree の入力。本 Unit は読み取りのみ
- wrapper 契約は installer 側 `ExtractedPayload`(payload-factory.ts)と共有 — u2 が消費(unit-of-work-dependency の u1→u2 統合点)。この契約の end-to-end 実証は unit-of-work-story-map の Slice 1(draft release E2E)が出荷判定として担う
