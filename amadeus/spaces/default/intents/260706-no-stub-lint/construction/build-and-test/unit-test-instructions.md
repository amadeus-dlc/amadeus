# Unit Test Instructions

Unit: no-stub-lint（Test Strategy: Minimal）

## 対象

rule の要求駆動検証は専用 eval に集約している。

```sh
npm run test:it:no-stub-compat
```

## 検査構成

(a) 6 検出カテゴリすべての意図的違反 fixture での検出（compat-symbol / compat-alias / compat-comment / stub-throw / stub-empty-todo / stub-always-pass）(b) 有効な許可リスト宣言による pass 転化 (c) 維持理由・終了条件欠落の無効宣言が pass にならないこと (d) 実ツリーへの --check 実行が出荷宣言込みで pass する回帰 assertion（FR-3.3 の自動固定）(e) package.json 配線の precedent 準拠 assert。

## TDD 証跡

eval 先行 RED（check.ts 不在 → 実装後も宣言未了の間は実ツリー回帰が 23 件を列挙して fail）→ 実装 → 宣言 → GREEN。conductor 独立検証（意図的違反の実地 fail → 宣言書式案内 → 除去 pass 復帰）も実施。詳細は code-generation の [code-summary.md](../no-stub-lint/code-generation/code-summary.md) を参照。
