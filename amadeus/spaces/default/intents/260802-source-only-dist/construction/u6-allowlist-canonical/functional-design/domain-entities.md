# Domain Entities — u6-allowlist-canonical

上流入力(consumes 全数): component-methods(C5 契約)、requirements(FR-5.2/5.3)、components(C5)、unit-of-work(u6)、unit-of-work-story-map(Slice 2)、services(該当外部なし)。

## 型定義(functional-domain-modeling-ts スタイル)

```ts
// packages/framework/core/tools/data/self-install-allowlist.ts
interface SelfInstallAllowlist {
  readonly tracked: readonly TrackedEntry[];        // 追跡するプロジェクト固有設定5件 + dispatcher(git ls-files 実測)
  readonly preservedRuntime: readonly string[];     // promote 保存だが未追跡5件(.codex/hooks.json 含む。.codex/local/ は ignore 未登録 — u8 申し送り)
  readonly perUserPatterns: readonly RegExp[];      // 第3カテゴリ(既存4 regex を移設)
}

interface TrackedEntry {
  readonly path: string;        // 面直下(深さ1)または dispatcher(深さ2)
  readonly depth: 1 | 2;        // .gitignore 否定パターンの導出に使用
}

namespace SelfInstallAllowlist {
  export declare function gitignoreExpectation(a: SelfInstallAllowlist): readonly string[]; // 否定+再包含パターン導出
  export declare function gitattributesExpectation(a: SelfInstallAllowlist): readonly string[]; // -linguist-generated 集合導出
  export declare function preserved(a: SelfInstallAllowlist): readonly string[]; // promote-self 互換ビュー
}
```

- 導出関数は純関数(検証は導出結果と実ファイルの突合 — 検証劇場にならない: 期待値は正本から、実測は追跡ファイルから独立に取得)

## 不変条件

1. tracked / preservedRuntime / perUserPatterns は排他(同一パス・パターンが複数区分に現れない)
2. `preserved(a)` = tracked のパス集合 ∪ preservedRuntime = 現行 preserved 10エントリ + dispatcher(移行時点の同値性を切替 PR で diff 実証)。tracked(git 追跡)と preserved(promote 保存)は別概念で、差集合が preservedRuntime
2b. `gitattributesExpectation(a)` = tracked ∪ {`.codex/hooks.json`}(歴史的例外を明示引数化 — 現行 .gitattributes 6エントリ実測と1:1。例外の維持/撤去は u8 棚卸しへ申し送り)
3. 深さ2エントリは `git check-ignore` 実測で「追跡可能」であること(BR-U6-5)
